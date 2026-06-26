import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_NAME        = 'VoidMark'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

Deno.serve(async (req) => {
  // Réservé aux appels internes (service role uniquement)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { comment_id } = await req.json()

  const { data: comment } = await supabase
    .from('comments')
    .select('id, body, url, from_user_id, profiles!from_user_id(username)')
    .eq('id', comment_id)
    .single()

  if (!comment) return new Response('Not found', { status: 404 })

  const fromUsername = (comment.profiles as { username: string } | null)?.username ?? 'Quelqu\'un'
  const hostname     = new URL(comment.url).hostname

  // Resolve @[uuid] mentions back to @username for display
  const mentionUuids = [...comment.body.matchAll(/@\[([0-9a-f-]+)\]/g)].map(m => m[1])
  let resolvedBody = comment.body
  if (mentionUuids.length > 0) {
    const { data: mentionProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', mentionUuids)
    for (const p of (mentionProfiles ?? []) as { id: string; username: string }[]) {
      resolvedBody = resolvedBody.replace(new RegExp(`@\\[${p.id}\\]`, 'g'), `@${p.username}`)
    }
  }
  // Escape HTML then style @mentions
  const htmlBody = escapeHtml(resolvedBody).replace(
    /@([A-Za-z0-9_]+)/g,
    '<strong style="color:#2563EB">@$1</strong>',
  )

  const { data: recipients } = await supabase
    .from('comment_recipients')
    .select('recipient_type, recipient_id, recipient_email')
    .eq('comment_id', comment_id)

  const toEmails: { address: string; name: string }[] = []

  const userIds = (recipients ?? [])
    .filter(r => r.recipient_type === 'user' && r.recipient_id && r.recipient_id !== comment.from_user_id)
    .map(r => r.recipient_id!)

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, username, notify_on_comment')
      .in('id', userIds)

    for (const p of profiles ?? []) {
      if (p.notify_on_comment !== false) {
        toEmails.push({ address: p.email, name: p.username })
      }
    }
  }

  for (const r of recipients ?? []) {
    if (r.recipient_type === 'email' && r.recipient_email) {
      toEmails.push({ address: r.recipient_email, name: r.recipient_email })
    }
  }

  let sent = 0
  const errors: unknown[] = []
  for (const { address, name } of toEmails) {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${APP_NAME} <noreply@voidmark.app>`,
        to:      address,
        subject: `${escapeHtml(fromUsername)} t'a laissé un commentaire`,
        html: `
          <p>Bonjour${name !== address ? ` ${escapeHtml(name)}` : ''},</p>
          <p><strong>${escapeHtml(fromUsername)}</strong> a laissé un commentaire pour toi sur <em>${escapeHtml(hostname)}</em>.</p>
          <blockquote style="border-left:3px solid #2563EB;padding-left:12px;color:#475569">
            ${htmlBody}
          </blockquote>
          <p>Installe l'extension <a href="https://voidmark.app">VoidMark</a> pour voir la capture et répondre.</p>
        `,
      }),
    })
    if (res.ok) {
      sent++
    } else {
      errors.push({ status: res.status, body: await res.text() })
    }
  }

  return new Response(JSON.stringify({ sent, toEmails, errors, hasApiKey: !!RESEND_API_KEY }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
