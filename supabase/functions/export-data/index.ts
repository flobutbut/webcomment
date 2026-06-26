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

  const uid = user.id

  const [
    { data: profile },
    { data: commentsSent },
    { data: commentsReceived },
    { data: urlFollows },
    { data: contacts },
    { data: groupMemberships },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, email, initials, avatar_url, baseline, created_at')
      .eq('id', uid)
      .single(),

    supabase
      .from('comments')
      .select('id, url, body, tags, mentions, created_at')
      .eq('from_user_id', uid)
      .order('created_at', { ascending: false }),

    supabase
      .from('comment_recipients')
      .select('read_at, resolved_at, created_at, comments(url, body, tags, created_at, profiles!from_user_id(username))')
      .eq('recipient_id', uid)
      .eq('recipient_type', 'user')
      .order('created_at', { ascending: false }),

    supabase
      .from('url_follows')
      .select('url, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),

    supabase
      .from('contacts')
      .select('status, created_at, requester:profiles!contacts_requester_id_fkey(username), addressee:profiles!contacts_addressee_id_fkey(username)')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order('created_at', { ascending: false }),

    supabase
      .from('group_members')
      .select('role, joined_at, groups(name)')
      .eq('user_id', uid)
      .order('joined_at', { ascending: false }),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    gdpr_notice: 'Export generated under GDPR Art. 20 — Right to data portability.',
    profile,
    comments_sent:     commentsSent     ?? [],
    comments_received: commentsReceived ?? [],
    url_follows:       urlFollows       ?? [],
    contacts:          contacts         ?? [],
    group_memberships: groupMemberships ?? [],
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type':                'application/json',
      'Content-Disposition':         'attachment; filename="voidmark-data-export.json"',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
