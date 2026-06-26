import { useEffect, useState } from 'react'
import { Icon }          from '@iconify/react'
import arrowLeftIcon     from '@iconify-icons/lucide/arrow-left'
import usersIcon         from '@iconify-icons/lucide/users'
import plusIcon          from '@iconify-icons/lucide/plus'
import trash2Icon        from '@iconify-icons/lucide/trash-2'
import userPlusIcon      from '@iconify-icons/lucide/user-plus'
import imageOffIcon      from '@iconify-icons/lucide/image-off'
import pencilIcon        from '@iconify-icons/lucide/pencil'
import checkIcon         from '@iconify-icons/lucide/check'
import xIcon             from '@iconify-icons/lucide/x'
import { Button }        from '../components/Button'
import { Avatar }        from '../components/Avatar'
import { Loading }       from '../components/Loading'
import { BodyText }      from '../components/BodyText'
import { supabase }      from '../../shared/supabase'
import type { Group, GroupMember, GroupFeedItem } from '../../shared/types'
import { hostname, timeAgo, resolveBody } from '../../shared/utils'

type GroupView  = 'list' | 'detail'
type DetailTab  = 'feed' | 'members'

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function Groups({ userId }: { userId: string }) {
  const [view,          setView]          = useState<GroupView>('list')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groups,        setGroups]        = useState<Group[]>([])
  const [loading,       setLoading]       = useState(true)
  const [creating,      setCreating]      = useState(false)
  const [newName,       setNewName]       = useState('')
  const [saving,        setSaving]        = useState(false)

  async function loadGroups() {
    const { data } = await supabase.rpc('get_user_groups')
    setGroups((data as Group[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [userId])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    const { data, error } = await supabase.rpc('create_group', { p_name: name })
    if (!error) {
      const newId = data as string
      setNewName('')
      setCreating(false)
      await loadGroups()
      const { data: fresh } = await supabase.rpc('get_user_groups')
      const created = (fresh as Group[])?.find(g => g.id === newId) ?? null
      if (created) { setSelectedGroup(created); setView('detail') }
    }
    setSaving(false)
  }

  if (view === 'detail' && selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        userId={userId}
        onBack={() => { setView('list'); loadGroups() }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <span className="text-[13px] font-semibold text-gray-900">My Groups</span>
        <button
          onClick={() => { setCreating(c => !c); setNewName('') }}
          className="flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-6 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Icon icon={plusIcon} width={11} height={11} />
          New
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Group name</p>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="e.g. Design Team"
            className="w-full border border-gray-200 rounded-6 px-3 py-1.5 text-[12px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-2"
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setCreating(false); setNewName('') }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <Loading />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Icon icon={usersIcon} width={18} height={18} className="text-gray-400" />
          </div>
          <p className="text-[13px] text-gray-500 mb-1">No groups yet</p>
          <p className="text-[12px] text-gray-300">Create a group to share comments privately.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => { setSelectedGroup(group); setView('detail') }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Icon icon={usersIcon} width={14} height={14} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{group.name}</p>
                <p className="text-[11px] text-gray-400">{group.member_count} member{group.member_count !== 1 ? 's' : ''}</p>
              </div>
              {group.role === 'owner' && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded-3 px-1.5 py-0.5 font-medium flex-shrink-0">Owner</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group detail (feed + members)
// ---------------------------------------------------------------------------

function GroupDetail({ group, userId, onBack }: { group: Group; userId: string; onBack: () => void }) {
  const [tab,          setTab]          = useState<DetailTab>('feed')
  const [feed,         setFeed]         = useState<GroupFeedItem[]>([])
  const [members,      setMembers]      = useState<GroupMember[]>([])
  const [loading,      setLoading]      = useState(true)
  const [editingName,  setEditingName]  = useState(false)
  const [draftName,    setDraftName]    = useState(group.name)
  const [currentGroup, setCurrentGroup] = useState(group)

  const isOwner = currentGroup.role === 'owner'

  useEffect(() => { loadTab() }, [tab, currentGroup.id])

  async function loadTab() {
    setLoading(true)
    if (tab === 'feed') {
      const { data } = await supabase.rpc('get_group_feed', { p_group_id: currentGroup.id })
      setFeed((data as GroupFeedItem[]) ?? [])
    } else {
      const { data } = await supabase.rpc('get_group_members', { p_group_id: currentGroup.id })
      setMembers((data as GroupMember[]) ?? [])
    }
    setLoading(false)
  }

  async function handleRename() {
    const name = draftName.trim()
    if (!name || name === currentGroup.name) { setEditingName(false); return }
    const { error } = await supabase.from('groups').update({ name }).eq('id', currentGroup.id)
    if (!error) setCurrentGroup(g => ({ ...g, name }))
    setEditingName(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0">
          <Icon icon={arrowLeftIcon} width={16} height={16} />
        </button>
        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Icon icon={usersIcon} width={11} height={11} className="text-indigo-600" />
        </div>

        {editingName ? (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <input
              autoFocus
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
              className="flex-1 text-[13px] font-semibold border border-blue-400 rounded-4 px-1.5 py-0.5 outline-none min-w-0"
            />
            <button onClick={handleRename} className="text-green-600 hover:text-green-700 p-0.5">
              <Icon icon={checkIcon} width={14} height={14} />
            </button>
            <button onClick={() => { setEditingName(false); setDraftName(currentGroup.name) }} className="text-gray-400 hover:text-gray-600 p-0.5">
              <Icon icon={xIcon} width={14} height={14} />
            </button>
          </div>
        ) : (
          <>
            <span className="text-[13px] font-semibold text-gray-900 flex-1 truncate">{currentGroup.name}</span>
            {isOwner && (
              <button onClick={() => setEditingName(true)} className="text-gray-300 hover:text-gray-500 p-0.5 flex-shrink-0">
                <Icon icon={pencilIcon} width={12} height={12} />
              </button>
            )}
            {currentGroup.role === 'owner' && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded-3 px-1.5 py-0.5 font-medium flex-shrink-0">Owner</span>
            )}
          </>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {(['feed', 'members'] as DetailTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[12px] font-medium transition-colors ${
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'feed' ? 'Feed' : 'Members'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? <Loading /> : tab === 'feed' ? (
          <GroupFeedTab feed={feed} groupName={currentGroup.name} />
        ) : (
          <GroupMembersTab
            members={members}
            userId={userId}
            isOwner={isOwner}
            groupId={currentGroup.id}
            onRefresh={loadTab}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feed tab
// ---------------------------------------------------------------------------

function ScreenshotThumb({ url, pinX, pinY }: { url: string; pinX: number; pinY: number }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative flex-shrink-0 w-14 h-10">
      {err ? (
        <div className="w-14 h-10 bg-gray-100 rounded-6 border border-gray-200 flex items-center justify-center">
          <Icon icon={imageOffIcon} width={12} height={12} />
        </div>
      ) : (
        <>
          <img
            src={url}
            className="w-14 h-10 object-cover rounded-6 border border-gray-200"
            alt=""
            onError={() => setErr(true)}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm"
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%, -50%)' }}
          />
        </>
      )}
    </div>
  )
}

function GroupFeedTab({ feed, groupName }: { feed: GroupFeedItem[]; groupName: string }) {
  if (feed.length === 0) return (
    <div className="p-6 text-center mt-6">
      <p className="text-[13px] text-gray-400">No comments yet.</p>
      <p className="text-[12px] text-gray-300 mt-1">
        Mention <span className="font-mono">@{groupName}</span> to share here.
      </p>
    </div>
  )

  return (
    <div className="divide-y divide-gray-100">
      {feed.map(item => (
        <div key={item.comment_id} className="px-4 py-3 flex gap-3">
          <ScreenshotThumb url={item.screenshot_url} pinX={item.pin_x} pinY={item.pin_y} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[13px] font-semibold text-gray-900 truncate">{item.from_username}</span>
              <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(item.created_at)}</span>
            </div>
            <p className="text-[11px] text-gray-500 truncate mb-0.5">{hostname(item.url)}</p>
            <p className="text-[12px] text-gray-600 truncate">
              {resolveBody(item.body, item.mentions ?? [])}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Members tab
// ---------------------------------------------------------------------------

function GroupMembersTab({
  members,
  userId,
  isOwner,
  groupId,
  onRefresh,
  onBack,
}: {
  members:   GroupMember[]
  userId:    string
  isOwner:   boolean
  groupId:   string
  onRefresh: () => void
  onBack:    () => void
}) {
  const [inviting,  setInviting]  = useState(false)
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<{ id: string; username: string; email: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId,  setAddingId]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const memberIds  = new Set(members.map(m => m.user_id))
  const ownerCount = members.filter(m => m.role === 'owner').length

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', userId)
        .limit(5)
      setResults((data ?? []).filter((u: { id: string }) => !memberIds.has(u.id)))
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  async function handleInvite(inviteeId: string) {
    setAddingId(inviteeId)
    setError(null)
    const { error } = await supabase.rpc('invite_group_member', { p_group_id: groupId, p_user_id: inviteeId })
    if (error) { setError(error.message); setAddingId(null); return }
    setAddingId(null)
    setQuery('')
    setResults([])
    setInviting(false)
    onRefresh()
  }

  async function handleToggleRole(member: GroupMember) {
    const newRole = member.role === 'owner' ? 'member' : 'owner'
    setError(null)
    const { error } = await supabase.rpc('update_member_role', {
      p_group_id: groupId,
      p_user_id:  member.user_id,
      p_role:     newRole,
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
    onBack()
  }

  async function handleDelete() {
    setError(null)
    const { error } = await supabase.from('groups').delete().eq('id', groupId)
    if (error) { setError(error.message); return }
    onBack()
  }

  return (
    <div className="p-4 space-y-4">

      {error && <p className="text-[11px] text-red-500 bg-red-50 rounded-6 px-3 py-2">{error}</p>}

      {/* Member rows */}
      <div className="space-y-1">
        {members.map(member => {
          const isSelf       = member.user_id === userId
          const isLastOwner  = member.role === 'owner' && ownerCount <= 1
          const canRemove    = isOwner && !isSelf
          const canToggle    = isOwner && !isSelf && !isLastOwner
          const canSelfDemote = isOwner && isSelf && ownerCount > 1

          return (
            <div key={member.user_id} className="flex items-center gap-2 py-1.5">
              <Avatar
                username={member.username}
                initials={member.initials}
                avatarUrl={member.avatar_url}
                className="w-7 h-7 text-[10px] flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-900 truncate">
                  {member.username}{isSelf ? ' (you)' : ''}
                </p>
              </div>
              {member.role === 'owner' && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded-3 px-1.5 py-0.5 font-medium flex-shrink-0">
                  Owner
                </span>
              )}
              {(canToggle || canSelfDemote) && (
                <button
                  onClick={() => handleToggleRole(member)}
                  className="text-[10px] text-gray-400 hover:text-indigo-600 px-1.5 py-0.5 rounded-3 hover:bg-indigo-50 transition-colors flex-shrink-0"
                >
                  {member.role === 'owner' ? 'Demote' : 'Make owner'}
                </button>
              )}
              {canRemove && (
                <button
                  onClick={() => handleRemove(member.user_id)}
                  className="text-gray-300 hover:text-red-500 p-0.5 flex-shrink-0 transition-colors"
                >
                  <Icon icon={trash2Icon} width={12} height={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Invite */}
      {isOwner && (
        inviting ? (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setInviting(false)}
              placeholder="Search by username or email…"
              className="w-full border border-gray-200 rounded-6 px-3 py-1.5 text-[12px] outline-none focus:border-blue-400"
            />
            {searching && <p className="text-[11px] text-gray-400">Searching…</p>}
            <div className="space-y-1">
              {results.map(u => (
                <div key={u.id} className="flex items-center gap-2 py-1">
                  <Avatar username={u.username} className="w-6 h-6 text-[9px] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{u.username}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(u.id)}
                    disabled={addingId === u.id}
                    className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-4 hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {addingId === u.id ? '…' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setInviting(false); setQuery(''); setResults([]) }}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setInviting(true)}
            className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 font-medium"
          >
            <Icon icon={userPlusIcon} width={13} height={13} />
            Invite member
          </button>
        )
      )}

      {/* Danger zone */}
      <div className="pt-3 border-t border-gray-100 space-y-2">
        {!isOwner && (
          <button
            onClick={handleLeave}
            className="text-[12px] text-red-500 hover:text-red-700 font-medium"
          >
            Leave group
          </button>
        )}
        {isOwner && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-700 font-medium"
          >
            <Icon icon={trash2Icon} width={12} height={12} />
            Delete group
          </button>
        )}
      </div>
    </div>
  )
}
