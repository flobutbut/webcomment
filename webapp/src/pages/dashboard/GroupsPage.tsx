import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Users, Plus, UserPlus, Trash2, Pencil, Check, X } from 'lucide-react'
import { supabase }       from '../../lib/supabase'
import { posthog }        from '../../lib/posthog'
import { Avatar }         from '../../components/Avatar'
import { Button }         from '../../components/Button'
import { Input }          from '../../components/Input'
import { Spinner }        from '../../components/Spinner'
import { EmptyState }     from '../../components/EmptyState'
import { CommentDetail }  from './CommentDetail'
import type { DashboardContext, Group, GroupMember, GroupFeedItem } from '../../lib/types'

type DetailTab = 'feed' | 'people'

// ---------------------------------------------------------------------------
// Entry point — two-column layout
// ---------------------------------------------------------------------------

export function GroupsPage() {
  const { userId } = useOutletContext<DashboardContext>()
  const [groups,        setGroups]        = useState<Group[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [creating,      setCreating]      = useState(false)
  const [newName,       setNewName]       = useState('')
  const [saving,        setSaving]        = useState(false)
  const [createError,   setCreateError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadGroups() {
    const { data } = await supabase.rpc('get_user_groups')
    setGroups((data as Group[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [userId])
  useEffect(() => { if (creating) setTimeout(() => inputRef.current?.focus(), 50) }, [creating])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setCreateError(null)
    const { data, error } = await supabase.rpc('create_group', { p_name: name })
    if (error) { setCreateError(error.message); setSaving(false); return }
    const newId = data as string
    posthog.capture('group_created', { group_name: name })
    setNewName('')
    setCreating(false)
    setSaving(false)
    await loadGroups()
    const { data: fresh } = await supabase.rpc('get_user_groups')
    const created = (fresh as Group[])?.find(g => g.id === newId) ?? null
    if (created) setSelectedGroup(created)
  }

  // Sync selected group data after refresh
  useEffect(() => {
    if (!selectedGroup) return
    const updated = groups.find(g => g.id === selectedGroup.id)
    if (updated) setSelectedGroup(updated)
  }, [groups])

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left column — group list ──────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-dark-border flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Groups</h1>
            <button
              onClick={() => { setCreating(c => !c); setNewName(''); setCreateError(null) }}
              className="w-7 h-7 flex items-center justify-center rounded-6 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="New group"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Create form (inline) */}
          {creating && (
            <div className="space-y-2 pt-1">
              {createError && <p className="text-[11px] text-red-500">{createError}</p>}
              <Input
                ref={inputRef}
                value={newName}
                onChange={e => { setNewName(e.target.value); setCreateError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Group name…"
                className="text-xs py-1.5"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="flex-1 text-xs font-medium py-1.5 rounded-6 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName('') }}
                  className="px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-6 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Spinner /></div>
          ) : groups.length === 0 ? (
            <EmptyState message="No groups yet. Create one to get started." variant="list" />
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-border-xs hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors flex items-center gap-3 ${
                  selectedGroup?.id === group.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'
                    : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{group.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {group.member_count} {group.member_count === 1 ? 'person' : 'people'}
                  </p>
                </div>
                {group.role === 'owner' && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3 px-1.5 py-0.5 font-semibold flex-shrink-0">
                    Owner
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right column — group detail ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedGroup ? (
          <GroupDetail
            key={selectedGroup.id}
            group={selectedGroup}
            userId={userId}
            onGroupChange={loadGroups}
            onDelete={() => { setSelectedGroup(null); loadGroups() }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Select a group to see its feed</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Group detail (right panel)
// ---------------------------------------------------------------------------

function GroupDetail({
  group,
  userId,
  onGroupChange,
  onDelete,
}: {
  group:         Group
  userId:        string
  onGroupChange: () => void
  onDelete:      () => void
}) {
  const [tab,         setTab]         = useState<DetailTab>('feed')
  const [feed,        setFeed]        = useState<GroupFeedItem[]>([])
  const [members,     setMembers]     = useState<GroupMember[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [draftName,   setDraftName]   = useState(group.name)
  const [groupName,   setGroupName]   = useState(group.name)
  const nameRef = useRef<HTMLInputElement>(null)

  const isOwner = group.role === 'owner'

  useEffect(() => { loadTab() }, [tab])
  useEffect(() => { if (editingName) setTimeout(() => nameRef.current?.focus(), 50) }, [editingName])

  async function loadTab() {
    setLoading(true)
    if (tab === 'feed') {
      const { data } = await supabase.rpc('get_group_feed', { p_group_id: group.id })
      setFeed((data as GroupFeedItem[]) ?? [])
    } else {
      const { data } = await supabase.rpc('get_group_members', { p_group_id: group.id })
      setMembers((data as GroupMember[]) ?? [])
    }
    setLoading(false)
  }

  async function handleRename() {
    const name = draftName.trim()
    if (!name || name === groupName) { setEditingName(false); return }
    const { error } = await supabase.from('groups').update({ name }).eq('id', group.id)
    if (!error) { setGroupName(name); onGroupChange() }
    setEditingName(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 dark:border-dark-border flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>

        {editingName ? (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              ref={nameRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditingName(false); setDraftName(groupName) }
              }}
              className="flex-1 text-sm font-semibold border border-blue-400 rounded-6 px-2 py-1 outline-none bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 min-w-0"
            />
            <button onClick={handleRename} className="text-green-600 hover:text-green-700 p-1 rounded-4 flex-shrink-0">
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditingName(false); setDraftName(groupName) }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-4 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
              {groupName}
            </h2>
            {isOwner && (
              <button
                onClick={() => setEditingName(true)}
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 p-1 rounded-4 flex-shrink-0 transition-colors"
                title="Rename group"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {group.role === 'owner' && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3 px-1.5 py-0.5 font-semibold flex-shrink-0">
                Owner
              </span>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-dark-border flex-shrink-0 px-5">
        {(['feed', 'people'] as DetailTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2.5 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'feed' ? 'Feed' : 'People'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Spinner /></div>
        ) : tab === 'feed' ? (
          <FeedTab feed={feed} groupName={groupName} />
        ) : (
          <PeopleTab
            members={members}
            userId={userId}
            isOwner={isOwner}
            groupId={group.id}
            onRefresh={loadTab}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feed tab
// ---------------------------------------------------------------------------

function FeedTab({ feed, groupName }: { feed: GroupFeedItem[]; groupName: string }) {
  if (feed.length === 0) return (
    <EmptyState
      message={`No comments yet. Mention @${groupName} to share here.`}
      variant="list"
    />
  )

  return (
    <div className="divide-y divide-gray-100 dark:divide-dark-border">
      {feed.map(item => (
        <CommentDetail
          key={item.comment_id}
          url={item.url}
          created_at={item.created_at}
          screenshot_url={item.screenshot_url}
          pin_x={item.pin_x}
          pin_y={item.pin_y}
          body={item.body}
          mentions={item.mentions ?? []}
          from_username={item.from_username}
          from_avatar_url={item.from_avatar_url}
          from_initials={item.from_initials}
          onOpenPage={() => window.open(item.url, '_blank')}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// People tab
// ---------------------------------------------------------------------------

function PeopleTab({
  members,
  userId,
  isOwner,
  groupId,
  onRefresh,
  onDelete,
}: {
  members:   GroupMember[]
  userId:    string
  isOwner:   boolean
  groupId:   string
  onRefresh: () => void
  onDelete:  () => void
}) {
  const [inviting,  setInviting]  = useState(false)
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<{ id: string; username: string; avatar_url?: string; initials?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId,  setAddingId]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const memberIds  = new Set(members.map(m => m.user_id))
  const ownerCount = members.filter(m => m.role === 'owner').length

  useEffect(() => { if (inviting) setTimeout(() => searchRef.current?.focus(), 50) }, [inviting])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase.rpc('search_profiles', { query })
      setResults((data ?? []).filter((u: { id: string }) => !memberIds.has(u.id)))
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function handleInvite(inviteeId: string) {
    setAddingId(inviteeId)
    setError(null)
    const { error } = await supabase.rpc('invite_group_member', { p_group_id: groupId, p_user_id: inviteeId })
    if (error) { setError(error.message); setAddingId(null); return }
    posthog.capture('group_member_invited')
    setAddingId(null); setQuery(''); setResults([]); setInviting(false)
    onRefresh()
  }

  async function handleToggleRole(member: GroupMember) {
    const newRole = member.role === 'owner' ? 'member' : 'owner'
    setError(null)
    const { error } = await supabase.rpc('update_member_role', {
      p_group_id: groupId, p_user_id: member.user_id, p_role: newRole,
    })
    if (error) { setError(error.message); return }
    onRefresh()
  }

  async function handleRemove(memberId: string) {
    setError(null)
    const { error } = await supabase.rpc('remove_group_member', { p_group_id: groupId, p_user_id: memberId })
    if (error) { setError(error.message); return }
    onRefresh()
  }

  async function handleLeave() {
    setError(null)
    const { error } = await supabase.rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId })
    if (error) { setError(error.message); return }
    posthog.capture('group_left')
    onDelete()
  }

  async function handleDelete() {
    setError(null)
    const { error } = await supabase.from('groups').delete().eq('id', groupId)
    if (error) { setError(error.message); return }
    posthog.capture('group_deleted')
    onDelete()
  }

  return (
    <div className="px-5 py-4 space-y-5">

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-9 px-4 py-2">{error}</p>
      )}

      {/* Member rows */}
      <div className="space-y-0.5">
        {members.map(member => {
          const isSelf      = member.user_id === userId
          const isLastOwner = member.role === 'owner' && ownerCount <= 1
          const canToggle   = isOwner && !(isSelf && isLastOwner)
          const canRemove   = isOwner && !isSelf

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-9 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
            >
              <Avatar
                username={member.username}
                initials={member.initials}
                avatarUrl={member.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {member.username}{isSelf ? ' (you)' : ''}
                </p>
              </div>
              {member.role === 'owner' && (
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3 px-1.5 py-0.5 font-semibold flex-shrink-0">
                  Owner
                </span>
              )}
              {canToggle && (
                <Button variant="outline" size="sm" onClick={() => handleToggleRole(member)}>
                  {member.role === 'owner' ? 'Demote' : 'Make owner'}
                </Button>
              )}
              {canRemove && (
                <button
                  onClick={() => handleRemove(member.user_id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-4 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Invite */}
      {isOwner && (
        inviting ? (
          <div className="space-y-3">
            <Input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setInviting(false)}
              placeholder="Search by username or email…"
            />
            {searching && <div className="flex justify-center py-2"><Spinner /></div>}
            {results.length > 0 && (
              <div className="space-y-0.5">
                {results.map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-2 px-3 rounded-9 hover:bg-gray-50 dark:hover:bg-dark-hover">
                    <Avatar username={u.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.username}</p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInvite(u.id)}
                      disabled={addingId === u.id}
                    >
                      {addingId === u.id ? '…' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setInviting(false); setQuery(''); setResults([]) }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setInviting(true)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Invite someone
          </button>
        )
      )}

      {/* Danger zone */}
      <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
        {!isOwner ? (
          <Button variant="danger-outline" size="sm" onClick={handleLeave}>
            Leave group
          </Button>
        ) : (
          <Button variant="danger-outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete group
          </Button>
        )}
      </div>
    </div>
  )
}
