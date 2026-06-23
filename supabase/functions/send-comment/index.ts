import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type Recipient =
  | { type: 'user' | 'group'; id: string }
  | { type: 'email'; email: string }
  | { type: 'public' }

interface SendCommentBody {
  comment_id:      string
  url:             string
  screenshot_path: string
  pin_x:           number
  pin_y:           number
  anchor_selector?: string
  anchor_x?:        number
  anchor_y?:        number
  body:            string
  to:              Recipient[]
}

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

  const body: SendCommentBody = await req.json()
  const { comment_id, url, screenshot_path, pin_x, pin_y, anchor_selector, anchor_x, anchor_y, to } = body

  const tags = [...new Set([...body.body.matchAll(/#([A-Za-z0-9_]+)/g)].map(m => m[1].toLowerCase()))]

  // Générer l'URL signée (7 jours)
  const { data: signedData, error: signError } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(screenshot_path, 60 * 60 * 24 * 7)
  if (signError) return new Response(signError.message, { status: 500 })

  // Insérer le commentaire
  const { error: insertError } = await supabase
    .from('comments')
    .insert({
      id:              comment_id,
      from_user_id:    user.id,
      url,
      screenshot_url:  signedData.signedUrl,
      screenshot_path,
      pin_x,
      pin_y,
      anchor_selector: anchor_selector ?? null,
      anchor_x:        anchor_x        ?? null,
      anchor_y:        anchor_y        ?? null,
      body:            body.body,
      tags,
    })
  if (insertError) return new Response(insertError.message, { status: 500 })

  // Résoudre les destinataires
  const recipientRows: {
    comment_id:      string
    recipient_type:  string
    recipient_id?:   string
    recipient_email?: string
  }[] = []

  for (const recipient of to) {
    if (recipient.type === 'public') {
      recipientRows.push({ comment_id, recipient_type: 'public' })
      continue
    } else if (recipient.type === 'user') {
      recipientRows.push({
        comment_id,
        recipient_type: 'user',
        recipient_id:   recipient.id,
      })
    } else if (recipient.type === 'group') {
      recipientRows.push({
        comment_id,
        recipient_type: 'group',
        recipient_id:   recipient.id,
      })

      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', recipient.id)

      for (const m of members ?? []) {
        recipientRows.push({
          comment_id,
          recipient_type: 'user',
          recipient_id:   m.user_id,
        })
      }
    } else if (recipient.type === 'email') {
      // Chercher si cet email correspond à un profil existant
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipient.email)
        .maybeSingle()

      if (profile) {
        recipientRows.push({
          comment_id,
          recipient_type: 'user',
          recipient_id:   profile.id,
        })
      } else {
        recipientRows.push({
          comment_id,
          recipient_type:  'email',
          recipient_email: recipient.email,
        })
      }
    }
  }

  const { error: recipError } = await supabase
    .from('comment_recipients')
    .insert(recipientRows)
  if (recipError) return new Response(recipError.message, { status: 500 })

  // Envoyer les emails de notification
  await supabase.functions.invoke('notify-email', {
    body: { comment_id, from_user_id: user.id },
  })

  return new Response(JSON.stringify({ comment_id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
