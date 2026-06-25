import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type Recipient =
  | { type: 'user' | 'group'; id: string }
  | { type: 'email'; email: string }
  | { type: 'public' }

interface SendCommentBody {
  comment_id:       string
  url:              string
  screenshot_path:  string
  pin_x:            number
  pin_y:            number
  anchor_path?:     string
  anchor_selector?: string
  anchor_x?:        number
  anchor_y?:        number
  body:             string
  to:               Recipient[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const payload: SendCommentBody = await req.json()
  const {
    comment_id, url, screenshot_path, pin_x, pin_y,
    anchor_path, anchor_selector, anchor_x, anchor_y, to,
  } = payload

  const tags        = [...new Set([...payload.body.matchAll(/#([A-Za-z0-9_]+)/g)].map(m => m[1].toLowerCase()))]
  const rawMentions = [...new Set([...payload.body.matchAll(/@([A-Za-z0-9_]+)/g)].map(m => m[1]))]

  // Resolve @username → @[uuid] so mentions survive username renames
  let processedBody = payload.body
  const mentionsData: { id: string; username: string }[] = []

  if (rawMentions.length > 0) {
    const { data: mentionedProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', rawMentions)
      .neq('id', user.id)

    for (const p of (mentionedProfiles ?? []) as { id: string; username: string }[]) {
      processedBody = processedBody.replace(
        new RegExp(`@${p.username}(?=[^A-Za-z0-9_]|$)`, 'g'),
        `@[${p.id}]`,
      )
      mentionsData.push({ id: p.id, username: p.username })
    }
  }

  // Signed screenshot URL (7 days)
  const { data: signedData, error: signError } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(screenshot_path, 60 * 60 * 24 * 7)
  if (signError) return new Response(signError.message, { status: 500 })

  const { error: insertError } = await supabase
    .from('comments')
    .insert({
      id:              comment_id,
      from_user_id:    user.id,
      url,
      screenshot_url:  signedData.signedUrl,
      screenshot_path,
      pin_x,
      pin_y,
      anchor_path:     anchor_path     ?? null,
      anchor_selector: anchor_selector ?? null,
      anchor_x:        anchor_x        ?? null,
      anchor_y:        anchor_y        ?? null,
      body:            processedBody,
      tags,
      mentions:        mentionsData,
    })
  if (insertError) return new Response(insertError.message, { status: 500 })

  // Build recipient rows
  const recipientRows: {
    comment_id:       string
    recipient_type:   string
    recipient_id?:    string
    recipient_email?: string
  }[] = []

  for (const recipient of to) {
    if (recipient.type === 'public') {
      recipientRows.push({ comment_id, recipient_type: 'public' })

      // Fan-out to all followers so the comment lands in their inbox
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', user.id)

      for (const f of (followers ?? []) as { follower_id: string }[]) {
        recipientRows.push({ comment_id, recipient_type: 'follow', recipient_id: f.follower_id })
      }
      continue
    }

    if (recipient.type === 'user') {
      recipientRows.push({ comment_id, recipient_type: 'user', recipient_id: recipient.id })
      continue
    }

    if (recipient.type === 'group') {
      recipientRows.push({ comment_id, recipient_type: 'group', recipient_id: recipient.id })
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', recipient.id)
      for (const m of (members ?? []) as { user_id: string }[]) {
        recipientRows.push({ comment_id, recipient_type: 'user', recipient_id: m.user_id })
      }
      continue
    }

    if (recipient.type === 'email') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipient.email)
        .maybeSingle()
      if (profile) {
        recipientRows.push({ comment_id, recipient_type: 'user', recipient_id: (profile as { id: string }).id })
      } else {
        recipientRows.push({ comment_id, recipient_type: 'email', recipient_email: recipient.email })
      }
    }
  }

  // Add @mention targets as direct recipients (deduped against existing rows)
  if (mentionsData.length > 0) {
    const explicitIds = new Set(
      recipientRows.filter(r => r.recipient_type === 'user').map(r => r.recipient_id!)
    )
    for (const m of mentionsData) {
      if (!explicitIds.has(m.id)) {
        recipientRows.push({ comment_id, recipient_type: 'user', recipient_id: m.id })
        explicitIds.add(m.id)
      }
    }
  }

  const { error: recipError } = await supabase
    .from('comment_recipients')
    .insert(recipientRows)
  if (recipError) return new Response(recipError.message, { status: 500 })

  await supabase.functions.invoke('notify-email', {
    body: { comment_id, from_user_id: user.id },
  })

  return new Response(JSON.stringify({ comment_id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
