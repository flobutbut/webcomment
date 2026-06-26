import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const APP_URL = Deno.env.get('APP_URL') || 'https://webcomment.app'

function page(title: string, body: string, color = '#2563EB') {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title} — WebComment</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             background:#0c0c0c;color:#e4e4e7;display:flex;align-items:center;
             justify-content:center;min-height:100vh;margin:0;padding:24px}
        .card{max-width:420px;width:100%;background:#161616;border:1px solid #27272a;
              border-radius:16px;padding:36px 32px}
        h1{font-size:18px;font-weight:600;color:${color};margin:0 0 12px}
        p{font-size:14px;color:#a1a1aa;line-height:1.6;margin:0}
        .dot{width:36px;height:36px;border-radius:50%;background:${color}1a;
             border:1px solid ${color}4d;display:flex;align-items:center;
             justify-content:center;margin-bottom:20px}
      </style>
    </head><body>
      <div class="card">
        <div class="dot">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${color === '#dc2626'
              ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
              : '<polyline points="20 6 9 17 4 12"/>'}
          </svg>
        </div>
        <h1>${title}</h1>
        <p>${body}</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return page('Invalid link', 'No token provided.', '#dc2626')
  }

  const { data: invite, error } = await supabase
    .from('invite_requests')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return page('Invalid link', 'This invite link is not valid or has expired.', '#dc2626')
  }

  if (invite.status === 'approved') {
    return page(
      'Already approved',
      `An invitation was already sent to <strong>${escapeHtml(invite.full_name)}</strong> (${escapeHtml(invite.email)}).`
    )
  }

  if (invite.status === 'rejected') {
    return page('Request rejected', 'This invite request was rejected.', '#dc2626')
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
      '#dc2626'
    )
  }

  await supabase
    .from('invite_requests')
    .update({ status: 'approved' })
    .eq('token', token)

  return page(
    'Invite sent ✓',
    `An account setup email has been sent to <strong>${escapeHtml(invite.full_name)}</strong> (${escapeHtml(invite.email)}).`
  )
})
