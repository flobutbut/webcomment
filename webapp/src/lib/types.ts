export type FilterType = 'tag' | 'url' | 'user'

export interface Profile {
  id:                string
  username:          string
  email:             string
  baseline:          string | null
  avatar_url:        string | null
  initials:          string | null
  created_at:        string
  notify_on_comment: boolean
  notify_on_contact: boolean
}

export interface Mention {
  id:       string
  username: string
}

export interface CommentInboxItem {
  recipient_id:    string
  comment_id:      string
  from_user_id:    string | null
  from_username:   string
  from_avatar_url: string | null
  from_initials:   string | null
  url:             string
  screenshot_url:  string
  pin_x:           number
  pin_y:           number
  body:            string
  mentions:        Mention[]
  tags:            string[] | null
  created_at:      string
  read_at:         string | null
  for_user_id:     string
  resolved_at:     string | null
  recipient_type:  'user' | 'group' | 'email' | 'public' | 'follow'
}

export interface SentComment {
  id:             string
  url:            string
  body:           string
  mentions:       Mention[]
  tags:           string[] | null
  screenshot_url: string
  pin_x:          number
  pin_y:          number
  created_at:     string
}

export interface ContactProfile {
  id:         string
  username:   string
  baseline:   string | null
  avatar_url: string | null
  initials?:  string | null
}

export interface Contact {
  id:         string
  status:     'pending' | 'accepted' | 'declined'
  created_at: string
  requester:  ContactProfile
  addressee:  ContactProfile
}

export interface Group {
  id:           string
  name:         string
  created_by:   string
  created_at:   string
  role:         'owner' | 'member'
  member_count: number
}

export interface GroupMember {
  user_id:    string
  username:   string
  avatar_url: string | null
  initials:   string | null
  role:       'owner' | 'member'
  joined_at:  string
}

export interface GroupFeedItem {
  comment_id:      string
  from_user_id:    string
  from_username:   string
  from_avatar_url: string | null
  from_initials:   string | null
  url:             string
  screenshot_url:  string
  pin_x:           number
  pin_y:           number
  body:            string
  mentions:        Mention[]
  tags:            string[] | null
  created_at:      string
}

export type Theme = 'light' | 'dark' | 'system'

export interface DashboardContext {
  userId:         string
  profile:        Profile | null
  search:         string
  filterTypes:    Set<FilterType>
  refreshProfile: () => Promise<void>
  theme:          Theme
  setTheme:       (t: Theme) => void
}
