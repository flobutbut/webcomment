import type { CommentInboxItem, PinPosition, ShareContext } from './types'

export type Message =
  | { type: 'ACTIVATE_PIN_PICKER' }
  | { type: 'PREPARE_CAPTURE';       payload: PinPosition }
  | { type: 'FINALIZE_COMMENT';      payload: FinalizePayload }
  | { type: 'SEARCH_USERS';          payload: { query: string } }
  | { type: 'SHOW_PINS';             payload: { comments: CommentInboxItem[]; targetCommentId?: string } }
  | { type: 'MARK_READ';             payload: { recipientId: string } }
  | { type: 'RESOLVE_COMMENT';       payload: { recipientId: string } }
  | { type: 'DELETE_COMMENT';        payload: { commentId: string } }
  | { type: 'ACTIVATE_ERROR_SCREEN'; payload: CommentInboxItem }
  | { type: 'GET_SESSION' }
  | { type: 'SHARE_CONTEXT_ACTIVE';  payload: ShareContext }
  | { type: 'CONTENT_READY' }
  | { type: 'REFRESH_PINS';          payload: { visible: boolean } }
  | { type: 'UPDATE_BADGE' }

export type RecipientEntry =
  | { type: 'user'; id: string }
  | { type: 'public' }

export interface FinalizePayload {
  body: string
  to:   RecipientEntry[]
}
