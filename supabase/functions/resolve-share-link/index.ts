import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Utilise le service role : résolution publique (pas d'auth requise)
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

  const { token }: { token: string } = await req.json()
  if (!token) return new Response('Missing token', { status: 400 })

  // Récupérer le lien avec les infos du créateur
  const { data, error } = await supabase
    .from('share_links')
    .select('url, domain, scope, expires_at, created_by, profiles(username)')
    .eq('token', token)
    .single()

  if (error || !data) return new Response('Not found', { status: 404 })

  // Vérifier l'expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new Response('Link expired', { status: 410 })
  }

  return new Response(
    JSON.stringify({
      url:            data.url,
      domain:         data.domain,
      scope:          data.scope,
      recipient_id:   data.created_by,
      recipient_name: (data.profiles as { username: string }).username,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
