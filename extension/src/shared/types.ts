export interface Profile {
  id:         string
  username:   string
  email:      string
  avatar_url: string | null
  initials:   string | null
  created_at: string
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
  anchor_selector: string | null
  anchor_x:        number | null
  anchor_y:        number | null
  body:            string
  created_at:      string
  read_at:         string | null
  for_user_id:     string
  resolved_at:     string | null
  recipient_type:  'user' | 'group' | 'email' | 'public'
}

export interface PinPosition {
  x:               number
  y:               number
  anchor_selector: string
  anchor_x:        number
  anchor_y:        number
}

export interface SentComment {
  id:            string
  url:           string
  body:          string
  screenshot_url: string
  pin_x:         number
  pin_y:         number
  created_at:    string
}

export interface ShareContext {
  recipient_id:   string
  recipient_name: string
  url:            string
  scope:          'page' | 'domain'
}

export interface CommentLinkContext {
  comment_id: string
  url:        string
}

export interface ContactProfile {
  id:        string
  username:  string
  email:     string
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
