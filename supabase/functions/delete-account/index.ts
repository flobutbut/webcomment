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

  // Déplacer les screenshots vers un dossier neutre avant suppression.
  // Cela retire le UUID de l'utilisateur du chemin de stockage (RGPD Art. 17)
  // tout en préservant les fichiers pour les destinataires des commentaires.
  const { data: files } = await supabase.storage
    .from('screenshots')
    .list(user.id)

  if (files?.length) {
    for (const file of files) {
      const oldPath = `${user.id}/${file.name}`
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

  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('delete-account error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type':               'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
