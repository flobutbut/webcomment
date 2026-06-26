import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL    = 'f.butour@gmail.com'
const APP_NAME       = 'WebComment'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  let body: { full_name?: string; email?: string }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const full_name = body.full_name?.trim()
  const email     = body.email?.trim().toLowerCase()

  if (!full_name || full_name.length < 2 || full_name.length > 100) {
    return json({ error: 'Full name must be 2–100 characters.' }, 400)
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address.' }, 400)
  }

  const { error: insertError } = await supabase
    .from('invite_requests')
    .insert({ full_name, email })

  if (insertError) {
    // Unique violation on email — return 200 to avoid leaking whether email exists
    if (insertError.code === '23505') return json({ ok: true })
    return json({ error: 'Could not save request.' }, 500)
  }

  const { data: row } = await supabase
    .from('invite_requests')
    .select('token')
    .eq('email', email)
    .single()

  const approveUrl =
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-invite?token=${row?.token}`

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `${APP_NAME} <noreply@webcomment.app>`,
      to:      ADMIN_EMAIL,
      subject: `New invite request — ${escapeHtml(full_name)}`,
      html: `
        <p style="font-family:sans-serif;color:#111">New early access request:</p>
        <table style="font-family:sans-serif;color:#555;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0"><strong>Name</strong></td><td>${escapeHtml(full_name)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        </table>
        <a href="${approveUrl}"
           style="display:inline-block;padding:10px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;font-family:sans-serif;font-weight:600;font-size:14px">
          Approve invite →
        </a>
        <p style="font-family:sans-serif;color:#999;font-size:12px;margin-top:24px">
          Clicking will immediately send the account setup email to the user.
        </p>
      `,
    }),
  })

  return json({ ok: true })
})
