import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ADMIN_EMAIL = 'f.butour@gmail.com'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function deleteUser(targetUserId: string) {
  // Move screenshots to neutral folder before deletion (RGPD Art. 17)
  const { data: files } = await supabase.storage
    .from('screenshots')
    .list(targetUserId)

  if (files?.length) {
    for (const file of files) {
      const oldPath = `${targetUserId}/${file.name}`
      const newPath = `deleted/${file.name}`
      const { error: moveError } = await supabase.storage
        .from('screenshots')
        .move(oldPath, newPath)
      if (!moveError) {
        await supabase
          .from('comments')
          .update({ screenshot_path: newPath })
          .eq('screenshot_path', oldPath)
      }
    }
  }

  return supabase.auth.admin.deleteUser(targetUserId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  // Determine target: admin can pass target_user_id, otherwise self-delete
  const body = await req.json().catch(() => null)
  let targetUserId = user.id

  if (body?.target_user_id) {
    if (user.email !== ADMIN_EMAIL) return json({ error: 'Forbidden' }, 403)
    targetUserId = body.target_user_id
  }

  const { error } = await deleteUser(targetUserId)
  if (error) {
    console.error('delete-account error:', error)
    return json({ error: error.message }, 500)
  }

  return json({ ok: true })
})
