import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

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

  const { data: rows, error: fetchError } = await supabase
    .from('screenshot_cleanup_queue')
    .select('id, path')
    .order('created_at', { ascending: true })
    .limit(100)

  if (fetchError) return new Response(fetchError.message, { status: 500 })
  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const paths = rows.map((r: { id: string; path: string }) => r.path)
  const ids   = rows.map((r: { id: string; path: string }) => r.id)

  // Non-fatal: file may already be gone (e.g. deleted explicitly by the extension)
  await supabase.storage.from('screenshots').remove(paths)

  const { error: deleteError } = await supabase
    .from('screenshot_cleanup_queue')
    .delete()
    .in('id', ids)

  if (deleteError) return new Response(deleteError.message, { status: 500 })

  return new Response(JSON.stringify({ deleted: paths.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
