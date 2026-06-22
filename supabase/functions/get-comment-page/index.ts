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
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const reqUrl    = new URL(req.url)
  const commentId = reqUrl.searchParams.get('id')
  const format    = reqUrl.searchParams.get('format')

  if (!commentId) {
    return new Response('id manquant', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' },
    })
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .select('id, url, body, screenshot_path, pin_x, pin_y, created_at, profiles(username)')
    .eq('id', commentId)
    .single()

  if (error || !comment) {
    return new Response('Commentaire introuvable.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' },
    })
  }

  const username      = (comment.profiles as { username: string } | null)?.username ?? 'Inconnu'
  const formattedDate = new Date(comment.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Format JSON : appel interne depuis la page HTML statique (Phase 4)
  if (format === 'json') {
    const { data: signed } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(comment.screenshot_path, 3600)

    return new Response(
      JSON.stringify({
        username,
        body:           comment.body,
        date:           formattedDate,
        screenshot_url: signed?.signedUrl ?? '',
        pin_x:          comment.pin_x,
        pin_y:          comment.pin_y,
        url:            comment.url,
      }),
      {
        headers: {
          'content-type':                'application/json',
          'access-control-allow-origin': '*',
          'cache-control':               'no-cache, no-store',
        },
      }
    )
  }

  // Fallback texte lisible pour les navigateurs sans extension.
  // Note : Supabase force text/plain + CSP restrictif sur tout son domaine —
  // le HTML n'est pas rendu. La page HTML complète sera servie depuis webcomment.app (Phase 4).
  const lines = [
    '=== WebComment ===',
    '',
    "Pour voir ce commentaire directement sur la page, installe l'extension :",
    'https://chromewebstore.google.com/detail/webcomment',
    '',
    'De      : ' + username,
    'Date    : ' + formattedDate,
    'Message : ' + comment.body,
    '',
    'Page : ' + comment.url,
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'content-type':                'text/plain; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control':               'no-cache, no-store',
    },
  })
})
