import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const APP_URL    = Deno.env.get('APP_URL') || 'https://voidmark.app'
const ADMIN_EMAIL = 'f.butour@gmail.com'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function page(title: string, body: string, status: 'success' | 'error' | 'info' = 'success') {
  const colors = {
    success: { accent: '#22c55e', bg: '#052e16', border: '#166534' },
    error:   { accent: '#ef4444', bg: '#2d0a0a', border: '#7f1d1d' },
    info:    { accent: '#6366f1', bg: '#1e1b4b', border: '#3730a3' },
  }
  const c = colors[status]
  const icon = status === 'error'
    ? '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
    : status === 'info'
    ? '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
    : '<polyline points="20 6 9 17 4 12"/>'

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — VoidMark Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #09090b; color: #e4e4e7;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px; gap: 32px;
    }
    .logo {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px; font-weight: 700; letter-spacing: .15em;
      color: #52525b; text-transform: uppercase;
    }
    .card {
      max-width: 400px; width: 100%;
      background: #111113; border: 1px solid #27272a;
      border-radius: 16px; padding: 32px 28px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .icon-wrap {
      width: 44px; height: 44px; border-radius: 50%;
      background: ${c.bg}; border: 1px solid ${c.border};
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    h1 { font-size: 17px; font-weight: 600; color: #fafafa; }
    .body { font-size: 14px; color: #a1a1aa; line-height: 1.65; }
    .body strong { color: #e4e4e7; font-weight: 500; }
    .divider { border: none; border-top: 1px solid #27272a; }
    .meta { font-size: 12px; color: #52525b; }
  </style>
</head>
<body>
  <span class="logo">VoidMark Admin</span>
  <div class="card">
    <div class="icon-wrap">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="${c.accent}" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        ${icon}
      </svg>
    </div>
    <div>
      <h1>${title}</h1>
    </div>
    <p class="body">${body}</p>
    <hr class="divider">
    <p class="meta">VoidMark · Early access</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── POST — backoffice API (approve or reject by id) ──────────────────────────
async function handlePost(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return json({ error: 'Unauthorized' }, 401)

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || user?.email !== ADMIN_EMAIL) return json({ error: 'Forbidden' }, 403)

  let body: { invite_id?: string; action?: string; email?: string; full_name?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action } = body
  if (!action) return json({ error: 'action is required' }, 400)

  // ── direct invite (admin sends without a prior request) ──
  if (action === 'direct') {
    const email     = body.email?.trim().toLowerCase()
    const full_name = body.full_name?.trim() || email?.split('@')[0] || ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address.' }, 400)
    }

    const { error: inviteError } = await (supabase.auth.admin as unknown as {
      inviteUserByEmail: (email: string, opts: { redirectTo: string; data: Record<string, string> }) => Promise<{ error: Error | null }>
    }).inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/welcome`,
      data: { full_name },
    })
    if (inviteError) return json({ error: inviteError.message }, 500)

    // upsert a record so it shows up in the backoffice history
    await supabase
      .from('invite_requests')
      .upsert({ email, full_name, status: 'approved' }, { onConflict: 'email' })

    return json({ ok: true })
  }

  // ── approve / reject an existing request ──
  const { invite_id } = body
  if (!invite_id) return json({ error: 'invite_id is required' }, 400)
  if (action !== 'approve' && action !== 'reject') return json({ error: 'unknown action' }, 400)

  const { data: invite, error: fetchError } = await supabase
    .from('invite_requests')
    .select('*')
    .eq('id', invite_id)
    .single()

  if (fetchError || !invite) return json({ error: 'Invite request not found' }, 404)

  if (action === 'reject') {
    await supabase.from('invite_requests').update({ status: 'rejected' }).eq('id', invite_id)
    return json({ ok: true })
  }

  // approve
  if (invite.status === 'approved') return json({ ok: true, already: true })

  const { error: inviteError } = await (supabase.auth.admin as unknown as {
    inviteUserByEmail: (email: string, opts: { redirectTo: string; data: Record<string, string> }) => Promise<{ error: Error | null }>
  }).inviteUserByEmail(invite.email, {
    redirectTo: `${APP_URL}/welcome`,
    data: { full_name: invite.full_name },
  })

  if (inviteError) return json({ error: inviteError.message }, 500)

  await supabase.from('invite_requests').update({ status: 'approved' }).eq('id', invite_id)
  return json({ ok: true })
}

// ── GET — email link approval (returns HTML page) ────────────────────────────
async function handleGet(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return page('Invalid link', 'No token provided.', 'error')
  }

  const { data: invite, error } = await supabase
    .from('invite_requests')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return page('Invalid link', 'This invite link is not valid or has expired.', 'error')
  }

  if (invite.status === 'approved') {
    return page(
      'Already approved',
      `An invitation was already sent to <strong>${escapeHtml(invite.full_name)}</strong> (${escapeHtml(invite.email)}).`,
      'info'
    )
  }

  if (invite.status === 'rejected') {
    return page('Request rejected', 'This invite request was rejected.', 'error')
  }

  const { error: inviteError } = await (supabase.auth.admin as unknown as {
    inviteUserByEmail: (email: string, opts: { redirectTo: string; data: Record<string, string> }) => Promise<{ error: Error | null }>
  }).inviteUserByEmail(invite.email, {
    redirectTo: `${APP_URL}/welcome`,
    data: { full_name: invite.full_name },
  })

  if (inviteError) {
    return page(
      'Error sending invite',
      `Could not send the invitation email: ${escapeHtml(inviteError.message)}`,
      'error'
    )
  }

  await supabase
    .from('invite_requests')
    .update({ status: 'approved' })
    .eq('token', token)

  return page(
    'Invite sent',
    `An account setup email has been sent to <strong>${escapeHtml(invite.full_name)}</strong> at <strong>${escapeHtml(invite.email)}</strong>. They'll receive a link to set up their password.`,
    'success'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method === 'POST') return handlePost(req)
  return handleGet(req)
})
