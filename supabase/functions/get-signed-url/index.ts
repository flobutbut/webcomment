import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const url  = new URL(req.url)
  const path = url.searchParams.get('path')
  if (!path) return new Response('Missing path', { status: 400 })

  // Vérifier que l'utilisateur est expéditeur ou destinataire du commentaire associé
  const { data: comment } = await supabase
    .from('comments')
    .select('id, from_user_id')
    .eq('screenshot_path', path)
    .single()

  if (!comment) return new Response('Not found', { status: 404 })

  const isOwner = comment.from_user_id === user.id

  if (!isOwner) {
    const { data: recipient } = await supabase
      .from('comment_inbox')
      .select('recipient_id')
      .eq('comment_id', comment.id)
      .eq('for_user_id', user.id)
      .single()

    if (!recipient) return new Response('Forbidden', { status: 403 })
  }

  const { data, error } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (error) return new Response(error.message, { status: 500 })

  return new Response(JSON.stringify({ url: data.signedUrl }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
