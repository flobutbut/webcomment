import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase    = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const SHARE_BASE  = Deno.env.get('SHARE_BASE_URL') ?? 'https://webcomment.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { url, scope = 'page' }: { url: string; scope?: 'page' | 'domain' } = await req.json()
  if (!url) return new Response('Missing url', { status: 400 })

  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  // Créer le lien de partage
  const { data, error } = await supabase
    .from('share_links')
    .insert({
      created_by: user.id,
      url:        scope === 'page' ? url : null,
      domain,
      scope,
    })
    .select('token')
    .single()

  if (error || !data) return new Response(error?.message ?? 'Error', { status: 500 })

  return new Response(
    JSON.stringify({ token: data.token, share_url: `${SHARE_BASE}/s/${data.token}` }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
