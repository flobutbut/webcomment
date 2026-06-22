// Fonction one-shot : uploade c.html dans le bucket public 'pages'.
// À appeler une fois après création du bucket. Idempotent (upsert: true).
// Note : abandonné — Supabase Storage force également text/plain + CSP restrictif.
//        La vraie page HTML sera servie depuis webcomment.app en Phase 4.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (_req) => {
  const url = Deno.env.get('SUPABASE_URL')! + '/storage/v1/object/public/pages/c.html'
  return new Response(
    JSON.stringify({ note: 'Approche abandonnée — voir commentaire en haut du fichier.', url }),
    { headers: { 'content-type': 'application/json' } }
  )
})
