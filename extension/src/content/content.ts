import type { Message } from '../shared/messages'
import type { CommentInboxItem, ShareContext } from '../shared/types'
import { avatarColor, avatarInitials } from '../shared/utils'

const PUBLIC_MODE = import.meta.env.VITE_PUBLIC_MODE_ENABLED !== 'false'

// Signal extension presence to the host page (readable via data-webcomment-installed attribute)
document.documentElement.setAttribute('data-webcomment-installed', 'true')

async function safeSendMessage(message: Message): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message)
  } catch (err) {
    const text = (err as Error)?.message ?? ''
    if (text.includes('Extension context invalidated') || text.includes('Receiving end does not exist')) {
      return null
    }
    throw err
  }
}

// Inline Lucide SVGs — used in the Shadow DOM (no React available here)
const SVG_X    = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
const SVG_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`
const SVG_CHECK  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const SVG_GLOBE   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
const SVG_TRASH   = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`
const SVG_RESOLVE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`
const SVG_BACK    = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`
const SVG_USER    = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
const SVG_FOLLOW  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`


function buildPinElement(comment: CommentInboxItem): HTMLDivElement {
  const pin = document.createElement('div')
  pin.dataset.webcommentPin = 'true'

  Object.assign(pin.style, {
    position: 'absolute',
    width: '28px', height: '28px', borderRadius: '50%',
    border: '2px solid white',
    cursor: 'pointer', zIndex: '2147483646',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
    overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: '0',
  })

  if (comment.from_avatar_url) {
    const img = document.createElement('img')
    img.src = comment.from_avatar_url
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' })
    img.onerror = () => {
      img.remove()
      renderInitials(pin, comment.from_username, comment.from_initials)
    }
    pin.appendChild(img)
  } else {
    renderInitials(pin, comment.from_username, comment.from_initials)
  }

  return pin
}

function renderInitials(el: HTMLElement, username: string, initials?: string | null) {
  el.style.background    = avatarColor(username)
  el.style.color         = 'white'
  el.style.fontSize      = '10px'
  el.style.fontWeight    = '700'
  el.style.fontFamily    = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  el.style.letterSpacing = '0.02em'
  el.textContent         = avatarInitials(username, initials)
}

// Prevent duplicate listeners if the script is re-injected
if ((window as unknown as Record<string, unknown>).__webcomment_injected) {
  safeSendMessage({ type: 'ACTIVATE_PIN_PICKER' })
} else {
  (window as unknown as Record<string, unknown>).__webcomment_injected = true
  init()
}

function init() {

let pinPickerActive = false
const pinMap = new Map<HTMLElement, CommentInboxItem>()

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'ACTIVATE_PIN_PICKER':
      activatePinPicker()
      sendResponse({ ok: true })
      break
    case 'SHOW_PINS':
      showPins(message.payload.comments, message.payload.targetCommentId)
      sendResponse({ ok: true })
      break
    case 'ACTIVATE_ERROR_SCREEN':
      showErrorScreen(message.payload)
      sendResponse({ ok: true })
      break
  }
  return true
})

// Tell the SW we're ready — it will push SHOW_PINS if pinsVisible is on.
// This is more reliable than relying on tabs.onUpdated timing.
safeSendMessage({ type: 'CONTENT_READY' })

// Alt+C (Option+C on Mac): activate pin picker when pins are visible on the current page
// Use e.code to match the physical key regardless of OS modifier output
document.addEventListener('keydown', e => {
  if (e.altKey && e.code === 'KeyC') {
    if (pinMap.size === 0) return
    if (document.getElementById('webcomment-composer-host')) return
    if (document.getElementById('webcomment-detail-host')) return
    e.preventDefault()
    activatePinPicker()
  }
})

checkShareContext()

// ---------------------------------------------------------------------------
// SPA navigation — notify the SW when the URL changes so it can re-fetch
// pins for the new URL. This does NOT control pin visibility (the interval
// below handles that via DOM presence checks).
// ---------------------------------------------------------------------------

let _lastHref = location.href
function onSpaNavigate() {
  const href = location.href
  if (href === _lastHref) return
  _lastHref = href
  setTimeout(() => safeSendMessage({ type: 'CONTENT_READY' }), 100)
}
window.addEventListener('popstate',   onSpaNavigate)
window.addEventListener('hashchange', onSpaNavigate)
const _origPush    = history.pushState.bind(history)
const _origReplace = history.replaceState.bind(history)
history.pushState    = function (...args) { _origPush(...args);    onSpaNavigate() }
history.replaceState = function (...args) { _origReplace(...args); onSpaNavigate() }

// ---------------------------------------------------------------------------
// DOM anchor check — polls every 800 ms. If the anchor element is gone or
// hidden (SPA view change), hides the pin. Shows it again when it reappears.
// Avoids MutationObserver self-trigger pitfall.
// ---------------------------------------------------------------------------

setInterval(() => {
  if (pinMap.size === 0) return
  pinMap.forEach((comment, pin) => {
    const pos = resolvePinPosition(comment)
    if (!pos && pin.style.display !== 'none') {
      pin.style.display = 'none'
      document.getElementById('webcomment-detail-host')?.remove()
    } else if (pos && pin.style.display === 'none') {
      pin.style.left    = `${pos.docX}px`
      pin.style.top     = `${pos.docY}px`
      pin.style.display = 'flex'
    }
  })
}, 800)

// ---------------------------------------------------------------------------
// Pin picker
// ---------------------------------------------------------------------------

function activatePinPicker() {
  if (pinPickerActive) return
  pinPickerActive = true
  document.body.style.cursor = 'crosshair'
  document.addEventListener('click', onPinClick, { once: true, capture: true })
}

async function onPinClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  pinPickerActive = false
  document.body.style.cursor = ''

  const x = (e.clientX / window.innerWidth)  * 100
  const y = (e.clientY / window.innerHeight) * 100

  // DOM anchor: rich path of clicked element + relative offset inside it
  const target      = e.target as Element
  const anchor_path = JSON.stringify(getDomPath(target))
  const rect        = target.getBoundingClientRect()
  const anchor_x    = rect.width  > 0 ? ((e.clientX - rect.left) / rect.width)  * 100 : 50
  const anchor_y    = rect.height > 0 ? ((e.clientY - rect.top)  / rect.height) * 100 : 50

  // Capture screenshot before showing the overlay
  const res = await safeSendMessage({
    type: 'PREPARE_CAPTURE',
    payload: { x, y, anchor_path, anchor_x, anchor_y },
  }) as { ok?: boolean; error?: string }

  if (!res?.ok) {
    showToast(`Capture error: ${res?.error ?? 'unknown'}`)
    return
  }

  showComposerOverlay(x, y)
}

// ---------------------------------------------------------------------------
// In-page composer (Shadow DOM)
// ---------------------------------------------------------------------------

function showComposerOverlay(pinX: number, pinY: number) {
  document.getElementById('webcomment-composer-host')?.remove()

  // Click pixel coordinates
  const clickPx = { x: (pinX / 100) * window.innerWidth, y: (pinY / 100) * window.innerHeight }

  // Modal position (Figma-style: anchored to click, adjusted to viewport edges)
  const W = 320, GAP = 16, MARGIN = 12
  let left = clickPx.x + GAP
  if (left + W > window.innerWidth - MARGIN) left = clickPx.x - W - GAP
  if (left < MARGIN) left = MARGIN
  let top = clickPx.y - 60
  if (top < MARGIN) top = MARGIN
  if (top + 320 > window.innerHeight - MARGIN) top = window.innerHeight - 320 - MARGIN

  const host   = document.createElement('div')
  host.id      = 'webcomment-composer-host'
  const shadow = host.attachShadow({ mode: 'open' })

  shadow.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* Pin at click position */
      #pin-dot {
        position: fixed;
        left: ${clickPx.x}px; top: ${clickPx.y}px;
        width: 24px; height: 24px; border-radius: 50%;
        background: #2563EB; border: 2px solid #fff;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 8px rgba(37,99,235,0.4);
        z-index: 2147483646; pointer-events: none;
      }

      /* Transparent overlay to capture clicks outside modal */
      #backdrop {
        position: fixed; inset: 0; z-index: 2147483646;
      }

      #modal {
        position: fixed;
        left: ${left}px; top: ${top}px;
        width: ${W}px;
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: visible;
        z-index: 2147483647;
      }

      #header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      #title { font-size: 13px; font-weight: 600; color: #2563EB; }
      #close {
        background: none; border: none; cursor: pointer;
        color: #94a3b8; font-size: 15px; line-height: 1;
        padding: 2px 4px; border-radius: 3px; transition: color 0.1s;
      }
      #close:hover { color: #475569; }

      #at-dropdown { border-top: 1px solid #f1f5f9; background: #fff; max-height: 160px; overflow-y: auto; display: none; }
      .at-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; transition: background 0.1s; }
      .at-item:hover, .at-item.active { background: #f1f5f9; }
      .at-name { font-size: 13px; font-weight: 500; color: #1e293b; }
      .at-email { font-size: 12px; color: #94a3b8; }
      .at-group-icon { width: 22px; height: 22px; border-radius: 50%; background: #eef2ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .at-group-badge { font-size: 10px; color: #6366f1; background: #eef2ff; border-radius: 3px; padding: 1px 5px; font-weight: 600; margin-left: auto; }

      #body-area { padding: 10px 14px; }
      #message-input {
        width: 100%; border: 1px solid #e2e8f0; border-radius: 6px;
        padding: 7px 10px; font-size: 13px; color: #0f172a; background: #fff;
        resize: none; outline: none; font-family: inherit; line-height: 1.5;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      #message-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }

      #footer {
        display: flex; align-items: center; justify-content: flex-end;
        padding: 8px 14px 12px; gap: 8px;
      }
      #status { font-size: 12px; color: #ef4444; flex: 1; }
      #cancel {
        background: none; border: 1px solid #e2e8f0; border-radius: 6px;
        padding: 6px 12px; font-size: 12px; color: #64748b; cursor: pointer;
        font-family: inherit; transition: background 0.1s;
        display: flex; align-items: center; gap: 5px;
      }
      #cancel:hover { background: #f8fafc; }
      .kbd {
        font-size: 10px; opacity: 0.55; background: rgba(0,0,0,0.06);
        border-radius: 3px; padding: 1px 4px; font-family: inherit;
      }
      #send {
        background: #2563EB; color: #fff; border: none; border-radius: 6px;
        padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer;
        font-family: inherit; transition: background 0.15s;
      }
      #send:hover:not(:disabled) { background: #1d4ed8; }
      #send:disabled { opacity: 0.5; cursor: not-allowed; }
      ${PUBLIC_MODE ? `
      #public-label {
        display: flex; align-items: center; gap: 6px;
        cursor: pointer; user-select: none; font-family: inherit;
        font-size: 12px; color: #94a3b8; white-space: nowrap;
      }
      #public-label.active { color: #2563EB; }
      #public-switch {
        position: relative; flex-shrink: 0;
        width: 30px; height: 17px;
        background: #cbd5e1; border-radius: 9px;
        transition: background 0.2s;
      }
      #public-label.active #public-switch { background: #2563EB; }
      #public-thumb {
        position: absolute; top: 2px; left: 2px;
        width: 13px; height: 13px; border-radius: 50%;
        background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2);
        transition: left 0.2s;
      }
      #public-label.active #public-thumb { left: 15px; }
      ` : ''}
    </style>

    <div id="backdrop"></div>
    <div id="pin-dot"></div>
    <div id="modal">
      <div id="header">
        <span id="title">WebComment</span>
        <button id="close">${SVG_X}</button>
      </div>
      <div id="body-area">
        <textarea id="message-input" rows="3" placeholder="Your comment… @ to mention"></textarea>
      </div>
      <div id="at-dropdown"></div>
      <div id="footer">
        ${PUBLIC_MODE ? `<label id="public-label"><div id="public-switch"><div id="public-thumb"></div></div>Public</label>` : ''}
        <span id="status"></span>
        <button id="cancel">Cancel <span class="kbd">Esc</span></button>
        <button id="send" style="display:flex;align-items:center;gap:5px;">Send <span class="kbd">⇧↵</span></button>
      </div>
    </div>
  `

  document.body.appendChild(host)

  const backdrop    = shadow.getElementById('backdrop')!
  const closeBtn    = shadow.getElementById('close')!
  const cancelBtn   = shadow.getElementById('cancel')!
  const sendBtn    = shadow.getElementById('send') as HTMLButtonElement
  const msgInput   = shadow.getElementById('message-input') as HTMLTextAreaElement
  const atDropdown = shadow.getElementById('at-dropdown')!
  const statusEl   = shadow.getElementById('status')!
  let isPublic  = false
  let userGroups: { id: string; name: string }[] = []

  // Pre-fetch groups for @mention resolution at send time
  safeSendMessage({ type: 'GET_USER_GROUPS' }).then(res => {
    userGroups = (res as { groups?: { id: string; name: string }[] })?.groups ?? []
  })

  if (PUBLIC_MODE) {
    const publicLabel = shadow.getElementById('public-label') as HTMLLabelElement
    publicLabel.addEventListener('click', () => {
      isPublic = !isPublic
      publicLabel.classList.toggle('active', isPublic)
    })
  }

  function close() { host.remove() }
  backdrop.addEventListener('click', close)
  closeBtn.addEventListener('click', close)
  cancelBtn.addEventListener('click', close)

  // ------------------------------------------------------------------
  // @mention in textarea — users and groups
  // ------------------------------------------------------------------

  type AtItem =
    | { kind: 'user';  id: string; username: string; email: string }
    | { kind: 'group'; id: string; name: string }

  let atItems:    AtItem[] = []
  let atActiveIdx = -1
  let atStart     = 0

  function closeAt() {
    atDropdown.style.display = 'none'
    atDropdown.innerHTML     = ''
    atItems     = []
    atActiveIdx = -1
  }

  const SVG_USERS_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`

  function renderAt() {
    atDropdown.innerHTML = ''
    atActiveIdx = -1
    if (!atItems.length) { closeAt(); return }
    atItems.forEach(item => {
      const el = document.createElement('div')
      el.className = 'at-item'
      if (item.kind === 'group') {
        el.innerHTML = `<span class="at-group-icon">${SVG_USERS_SMALL}</span><span class="at-name">${escapeHtml(item.name)}</span><span class="at-group-badge">group</span>`
        el.addEventListener('mousedown', e => { e.preventDefault(); insertAtGroup(item) })
      } else {
        el.innerHTML = `<span class="at-name">@${escapeHtml(item.username)}</span><span class="at-email">${escapeHtml(item.email)}</span>`
        el.addEventListener('mousedown', e => { e.preventDefault(); insertAtUser(item) })
      }
      atDropdown.appendChild(el)
    })
    atDropdown.style.display = 'block'
  }

  function updateAtActive() {
    atDropdown.querySelectorAll('.at-item').forEach((el, i) => {
      el.classList.toggle('active', i === atActiveIdx)
    })
  }

  function insertAtUser(u: { id: string; username: string; email: string }) {
    const cursor = msgInput.selectionStart ?? 0
    const before = msgInput.value.slice(0, atStart)
    const after  = msgInput.value.slice(cursor)
    msgInput.value = before + `@${u.username} ` + after
    const pos = atStart + u.username.length + 2
    msgInput.setSelectionRange(pos, pos)
    closeAt()
    msgInput.focus()
  }

  function insertAtGroup(g: { id: string; name: string }) {
    const cursor = msgInput.selectionStart ?? 0
    const before = msgInput.value.slice(0, atStart)
    const after  = msgInput.value.slice(cursor)
    msgInput.value = before + `@${g.name} ` + after
    const pos = atStart + g.name.length + 2
    msgInput.setSelectionRange(pos, pos)
    closeAt()
    msgInput.focus()
  }

  let atSearchTimer: ReturnType<typeof setTimeout>
  msgInput.addEventListener('input', () => {
    clearTimeout(atSearchTimer)
    const cursor     = msgInput.selectionStart ?? 0
    const textBefore = msgInput.value.slice(0, cursor)
    const match      = textBefore.match(/@([A-Za-z0-9_]*)$/)
    if (!match) { closeAt(); return }
    const query = match[1]
    atStart = cursor - match[0].length
    if (!query) { closeAt(); return }
    atSearchTimer = setTimeout(async () => {
      const res = await safeSendMessage({
        type: 'SEARCH_RECIPIENTS', payload: { query },
      }) as { users?: { id: string; username: string; email: string }[]; groups?: { id: string; name: string }[] }
      const groups: AtItem[] = (res?.groups ?? []).map(g => ({ kind: 'group' as const, ...g }))
      const users:  AtItem[] = (res?.users  ?? []).map(u => ({ kind: 'user'  as const, ...u }))
      atItems = [...groups, ...users]
      renderAt()
    }, 200)
  })

  msgInput.addEventListener('keydown', e => {
    if (atDropdown.style.display !== 'none' && atItems.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        atActiveIdx = Math.min(atActiveIdx + 1, atItems.length - 1)
        updateAtActive(); return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        atActiveIdx = Math.max(atActiveIdx - 1, 0)
        updateAtActive(); return
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = atItems[atActiveIdx >= 0 ? atActiveIdx : 0]
        if (item.kind === 'group') insertAtGroup(item)
        else insertAtUser(item)
        return
      } else if (e.key === 'Escape') {
        closeAt(); return
      }
    }
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.shiftKey)) { e.preventDefault(); send() }
  })

  msgInput.addEventListener('blur', () => setTimeout(closeAt, 150))

  // Send
  sendBtn.addEventListener('click', send)

  async function send() {
    const body = msgInput.value.trim()
    if (!body) { statusEl.textContent = 'Write a message.'; return }

    // Separate @mentions in body into group vs user names
    const allMentionedNames = [...body.matchAll(/@([A-Za-z0-9_]+)/g)].map(m => m[1])
    const groupNameMap = new Map(userGroups.map(g => [g.name.toLowerCase(), g.id]))

    const seenGroupIds  = new Set<string>()
    const groupRecipients: { type: 'group'; id: string }[] = []
    const userMentionNames: string[] = []

    for (const name of allMentionedNames) {
      const groupId = groupNameMap.get(name.toLowerCase())
      if (groupId) {
        if (!seenGroupIds.has(groupId)) {
          groupRecipients.push({ type: 'group', id: groupId })
          seenGroupIds.add(groupId)
        }
      } else {
        userMentionNames.push(name.toLowerCase())
      }
    }

    // Resolve user @mentions
    const seenUserIds   = new Set<string>()
    const mentionedIds: { type: 'user'; id: string }[] = []
    for (const name of [...new Set(userMentionNames)]) {
      const res = await safeSendMessage({
        type: 'SEARCH_USERS', payload: { query: name },
      }) as { users?: { id: string; username: string; email: string }[] }
      const found = res?.users?.find(u => u.username.toLowerCase() === name)
      if (found && !seenUserIds.has(found.id)) {
        mentionedIds.push({ type: 'user', id: found.id })
        seenUserIds.add(found.id)
      }
    }

    const to: ({ type: 'public' } | { type: 'user'; id: string } | { type: 'group'; id: string })[] = [
      ...(isPublic ? [{ type: 'public' as const }] : []),
      ...groupRecipients,
      ...mentionedIds,
    ]

    // No recipient and not public → personal note
    if (!to.length) {
      const sessionRes = await safeSendMessage({ type: 'GET_SESSION' }) as { session?: { user: { id: string } } }
      const userId = sessionRes?.session?.user?.id
      if (userId) {
        to.push({ type: 'user', id: userId })
      } else {
        statusEl.textContent = 'Session expired, reload the page.'
        return
      }
    }

    sendBtn.disabled     = true
    statusEl.textContent = ''

    const res = await safeSendMessage({
      type: 'FINALIZE_COMMENT',
      payload: { body, to },
    }) as { success?: boolean; error?: string }

    if (res?.success) {
      showToast(isPublic ? 'Public comment sent' : 'Comment sent', true)
      close()
    } else {
      statusEl.textContent = `Error: ${res?.error ?? 'unknown'}`
      sendBtn.disabled = false
    }
  }

  // Pre-fill with @mention if a share link is active
  chrome.storage.local.get(`share:${location.href}`).then(result => {
    const shareCtx = result[`share:${location.href}`] as ShareContext | undefined
    if (!shareCtx) return
    msgInput.value = `@${shareCtx.recipient_name} `
    msgInput.setSelectionRange(msgInput.value.length, msgInput.value.length)
    msgInput.focus()
  })

  setTimeout(() => msgInput.focus(), 50)
}

// ---------------------------------------------------------------------------
// Pin detail overlay (click on an existing pin)
// ---------------------------------------------------------------------------

async function showPinDetail(comment: CommentInboxItem, pinEl: HTMLElement) {
  document.getElementById('webcomment-detail-host')?.remove()

  // Capture position synchronously before any await to prevent shift on back-navigation
  const pinRect = pinEl.getBoundingClientRect()
  const W = 296, GAP = 12, MARGIN = 10
  let left = pinRect.right + GAP
  if (left + W > window.innerWidth - MARGIN) left = pinRect.left - W - GAP
  if (left < MARGIN) left = MARGIN
  let top = pinRect.top - 40
  if (top < MARGIN) top = MARGIN
  if (top + 380 > window.innerHeight - MARGIN) top = window.innerHeight - 380 - MARGIN

  const sessionRes    = await safeSendMessage({ type: 'GET_SESSION' }) as { session?: { user: { id: string } } }
  const currentUserId = sessionRes?.session?.user?.id

  const recipientId = (comment as CommentInboxItem & { recipient_id?: string }).recipient_id
  const canDismiss  = !!recipientId && !comment.resolved_at
  const canDelete   = !!currentUserId && !!comment.from_user_id && comment.from_user_id === currentUserId
  const canProfile  = !!comment.from_user_id
  const hasActions  = canDismiss || canDelete || canProfile

  const formattedDate = new Date(comment.created_at).toLocaleString('en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const host   = document.createElement('div')
  host.id      = 'webcomment-detail-host'
  const shadow = host.attachShadow({ mode: 'open' })

  shadow.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      #backdrop { position: fixed; inset: 0; z-index: 2147483646; }
      #panel {
        position: fixed; left: ${left}px; top: ${top}px; width: ${W}px;
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 2147483647; overflow: hidden;
      }
      #header {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px 9px; border-bottom: 1px solid #f1f5f9;
      }
      #avatar {
        width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 700; color: #fff; overflow: hidden;
      }
      #avatar img { width: 100%; height: 100%; object-fit: cover; }
      #meta { flex: 1; min-width: 0; ${comment.from_user_id ? 'cursor: pointer;' : ''} }
      #meta:hover #username { ${comment.from_user_id ? 'color: #2563EB;' : ''} transition: color 0.1s; }
      #username { font-size: 12px; font-weight: 600; color: #1e293b; }
      #date { font-size: 11px; color: #94a3b8; margin-top: 1px; }
      #close-btn {
        background: none; border: none; cursor: pointer; color: #94a3b8;
        padding: 2px; border-radius: 3px; display: flex; align-items: center;
        transition: color 0.1s;
      }
      #close-btn:hover { color: #475569; }
      #body-text {
        padding: 10px 12px; font-size: 13px; color: #1e293b; line-height: 1.5;
      }
      #actions {
        display: flex; gap: 8px; padding: 0 12px 10px;
      }
      button.action {
        border: none; border-radius: 6px; cursor: pointer;
        padding: 5px 10px; font-size: 12px; font-weight: 500;
        font-family: inherit; display: flex; align-items: center; gap: 4px;
        transition: background 0.1s;
      }
      button.dismiss { background: #f1f5f9; color: #475569; }
      button.dismiss:hover:not(:disabled) { background: #e2e8f0; }
      button.profile { background: #eff6ff; color: #2563EB; }
      button.profile:hover:not(:disabled) { background: #dbeafe; }
      button.delete  { background: #fff1f2; color: #ef4444; margin-left: auto; }
      button.delete:hover:not(:disabled)  { background: #fee2e2; }
      button.action:disabled { opacity: 0.5; cursor: not-allowed; }
      #confirm-area {
        display: none; padding: 0 12px 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;
      }
      #confirm-area.visible { display: block; }
      #confirm-text { font-size: 12px; color: #475569; text-align: center; margin-bottom: 8px; }
      #confirm-btns { display: flex; gap: 6px; }
      button.confirm-cancel {
        flex: 1; border: 1px solid #e2e8f0; background: none; border-radius: 6px;
        padding: 5px 10px; font-size: 12px; color: #64748b; cursor: pointer;
        font-family: inherit; transition: background 0.1s;
      }
      button.confirm-cancel:hover { background: #f8fafc; }
      button.confirm-delete {
        flex: 1; border: none; background: #ef4444; color: #fff; border-radius: 6px;
        padding: 5px 10px; font-size: 12px; font-weight: 500; cursor: pointer;
        font-family: inherit; transition: background 0.1s;
      }
      button.confirm-delete:hover:not(:disabled) { background: #dc2626; }
      button.confirm-delete:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
    <div id="backdrop"></div>
    <div id="panel">
      <div id="header">
        <div id="avatar"></div>
        <div id="meta">
          <div id="username">${escapeHtml(comment.from_username)}</div>
          <div id="date">${escapeHtml(formattedDate)}</div>
        </div>
        <button id="close-btn" title="Esc">${SVG_X}</button>
      </div>
      <div id="body-text">${renderTaggedBody(comment.body, comment.mentions)}</div>
      ${hasActions ? `
      <div id="actions">
        ${canDismiss ? `<button class="action dismiss"  id="dismiss-btn">${SVG_CHECK} Dismiss</button>`  : ''}
        ${canProfile ? `<button class="action profile"  id="profile-btn">${SVG_USER}  Profile</button>`   : ''}
        ${canDelete  ? `<button class="action delete"   id="delete-btn">${SVG_TRASH}  Delete</button>`   : ''}
      </div>
      <div id="confirm-area">
        <p id="confirm-text">Permanently delete this comment?</p>
        <div id="confirm-btns">
          <button class="confirm-cancel" id="confirm-cancel">Cancel</button>
          <button class="confirm-delete" id="confirm-delete">Delete</button>
        </div>
      </div>` : ''}
    </div>
  `

  document.body.appendChild(host)

  // Keep the panel anchored to the pin while the page scrolls
  const panel = shadow.getElementById('panel') as HTMLDivElement
  function repositionPanel() {
    const r = pinEl.getBoundingClientRect()
    let l = r.right + GAP
    if (l + W > window.innerWidth - MARGIN) l = r.left - W - GAP
    if (l < MARGIN) l = MARGIN
    let t = r.top - 40
    if (t < MARGIN) t = MARGIN
    if (t + 380 > window.innerHeight - MARGIN) t = window.innerHeight - 380 - MARGIN
    panel.style.left = `${l}px`
    panel.style.top  = `${t}px`
  }
  window.addEventListener('scroll', repositionPanel, { passive: true })

  // Avatar
  const avatarEl = shadow.getElementById('avatar')!
  if (comment.from_avatar_url) {
    const img    = document.createElement('img')
    img.src      = comment.from_avatar_url
    img.onerror  = () => { img.remove(); renderInitials(avatarEl, comment.from_username, comment.from_initials) }
    avatarEl.appendChild(img)
  } else {
    renderInitials(avatarEl, comment.from_username, comment.from_initials)
  }

  const backdrop = shadow.getElementById('backdrop')!
  const closeBtn = shadow.getElementById('close-btn')!
  function close() {
    window.removeEventListener('scroll', repositionPanel)
    document.removeEventListener('keydown', onEsc)
    host.remove()
  }
  function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', onEsc)
  backdrop.addEventListener('click', close)
  closeBtn.addEventListener('click', close)

  if (comment.from_user_id) {
    shadow.getElementById('meta')!.addEventListener('click', () => {
      close()
      showUserProfile(comment, pinEl)
    })
  }

  const dismissBtn     = shadow.getElementById('dismiss-btn')     as HTMLButtonElement | null
  const profileBtn     = shadow.getElementById('profile-btn')     as HTMLButtonElement | null
  const deleteBtn      = shadow.getElementById('delete-btn')      as HTMLButtonElement | null
  const confirmArea    = shadow.getElementById('confirm-area')
  const confirmCancel  = shadow.getElementById('confirm-cancel')  as HTMLButtonElement | null
  const confirmDelete  = shadow.getElementById('confirm-delete')  as HTMLButtonElement | null

  dismissBtn?.addEventListener('click', async () => {
    dismissBtn.disabled = true
    const res = await safeSendMessage({
      type: 'RESOLVE_COMMENT',
      payload: { recipientId: recipientId! },
    }) as { error?: string }
    if (!res?.error) {
      showToast('Comment dismissed', true)
      close()
    } else {
      dismissBtn.disabled = false
    }
  })

  profileBtn?.addEventListener('click', () => {
    close()
    showUserProfile(comment, pinEl)
  })

  deleteBtn?.addEventListener('click', () => {
    deleteBtn.disabled = true
    confirmArea?.classList.add('visible')
  })

  confirmCancel?.addEventListener('click', () => {
    confirmArea?.classList.remove('visible')
    if (deleteBtn) deleteBtn.disabled = false
  })

  confirmDelete?.addEventListener('click', async () => {
    if (confirmDelete) confirmDelete.disabled = true
    const res = await safeSendMessage({
      type: 'DELETE_COMMENT',
      payload: { commentId: comment.comment_id },
    }) as { success?: boolean; error?: string }
    if (res?.success) {
      showToast('Comment deleted')
      close()
    } else {
      if (confirmDelete) confirmDelete.disabled = false
    }
  })
}

// ---------------------------------------------------------------------------
// User profile overlay (triggered from pin detail)
// ---------------------------------------------------------------------------

async function showUserProfile(comment: CommentInboxItem, pinEl: HTMLElement) {
  if (!comment.from_user_id) return
  document.getElementById('webcomment-profile-host')?.remove()
  document.getElementById('webcomment-detail-host')?.remove()

  const pinRect = pinEl.getBoundingClientRect()
  const W = 296, GAP = 12, MARGIN = 10
  let left = pinRect.right + GAP
  if (left + W > window.innerWidth - MARGIN) left = pinRect.left - W - GAP
  if (left < MARGIN) left = MARGIN
  let top = pinRect.top - 40
  if (top < MARGIN) top = MARGIN
  if (top + 440 > window.innerHeight - MARGIN) top = window.innerHeight - 440 - MARGIN

  const host   = document.createElement('div')
  host.id      = 'webcomment-profile-host'
  const shadow = host.attachShadow({ mode: 'open' })

  shadow.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      #backdrop { position: fixed; inset: 0; z-index: 2147483646; }
      #panel {
        position: fixed; left: ${left}px; top: ${top}px; width: ${W}px;
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 2147483647; overflow: hidden;
      }
      #header {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px 9px; border-bottom: 1px solid #f1f5f9;
      }
      #back-btn, #close-btn {
        background: none; border: none; cursor: pointer; color: #94a3b8;
        padding: 2px; border-radius: 3px; display: flex; align-items: center;
        transition: color 0.1s; flex-shrink: 0;
      }
      #back-btn:hover, #close-btn:hover { color: #475569; }
      #header-title { flex: 1; font-size: 12px; font-weight: 600; color: #94a3b8; text-align: center; }
      #profile-section {
        display: flex; flex-direction: column; align-items: center;
        padding: 16px 12px 14px; gap: 6px;
      }
      #avatar {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0;
      }
      #avatar img { width: 100%; height: 100%; object-fit: cover; }
      #username { font-size: 14px; font-weight: 600; color: #1e293b; }
      #comments-section { border-top: 1px solid #f1f5f9; }
      #comments-header {
        padding: 8px 12px 6px; font-size: 11px; font-weight: 500;
        color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em;
      }
      #comments-list { padding: 0 12px 10px; }
      .comment-item {
        border-radius: 6px; background: #f8fafc; margin-bottom: 4px;
        cursor: pointer; border: 1px solid transparent; transition: background 0.1s, border-color 0.1s;
        overflow: hidden;
      }
      .comment-item:hover { background: #eff6ff; border-color: #bfdbfe; }
      .ci-meta {
        display: flex; justify-content: space-between; align-items: center;
        padding: 5px 8px 2px;
      }
      .ci-domain { font-size: 11px; font-weight: 600; color: #2563EB; }
      .ci-arrow { color: #94a3b8; flex-shrink: 0; }
      .ci-body {
        padding: 0 8px 5px; font-size: 12px; color: #475569; line-height: 1.4;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #empty-msg { font-size: 12px; color: #94a3b8; text-align: center; padding: 8px 0 4px; }
      #footer { padding: 10px 12px 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px; }
      #add-contact-btn {
        width: 100%; border: none; border-radius: 6px; cursor: pointer;
        padding: 7px 12px; font-size: 12px; font-weight: 500; font-family: inherit;
        background: #2563EB; color: #fff; transition: background 0.1s;
        display: flex; align-items: center; justify-content: center; gap: 4px;
      }
      #add-contact-btn:hover:not(:disabled) { background: #1d4ed8; }
      #add-contact-btn:disabled { opacity: 0.6; cursor: default; }
      #add-contact-btn.sent { background: #16a34a; }
      #follow-btn {
        width: 100%; border: 1px solid #2563EB; border-radius: 6px; cursor: pointer;
        padding: 7px 12px; font-size: 12px; font-weight: 500; font-family: inherit;
        background: #fff; color: #2563EB; transition: all 0.1s;
        display: flex; align-items: center; justify-content: center; gap: 4px;
      }
      #follow-btn:hover:not(:disabled) { background: #eff6ff; }
      #follow-btn:disabled { opacity: 0.6; cursor: default; }
      #follow-btn.following { background: #f0fdf4; color: #16a34a; border-color: #16a34a; cursor: default; }
      #popup-cta { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
    </style>
    <div id="backdrop"></div>
    <div id="panel">
      <div id="header">
        <button id="back-btn" title="Back to comment">${SVG_BACK}</button>
        <span id="header-title">Profile</span>
        <button id="close-btn" title="Close">${SVG_X}</button>
      </div>
      <div id="profile-section">
        <div id="avatar"></div>
        <div id="username">@${escapeHtml(comment.from_username)}</div>
      </div>
      <div id="comments-section">
        <div id="comments-header">Public comments</div>
        <div id="comments-list"><div id="empty-msg">Loading…</div></div>
      </div>
      <div id="footer">
        <button id="add-contact-btn" disabled>Loading…</button>
        <div id="popup-cta">Open the extension to manage your contacts</div>
      </div>
    </div>
  `

  document.body.appendChild(host)

  const avatarEl = shadow.getElementById('avatar')!
  if (comment.from_avatar_url) {
    const img = document.createElement('img')
    img.src = comment.from_avatar_url
    img.onerror = () => { img.remove(); renderInitials(avatarEl, comment.from_username, comment.from_initials) }
    avatarEl.appendChild(img)
  } else {
    renderInitials(avatarEl, comment.from_username, comment.from_initials)
  }

  const panel = shadow.getElementById('panel') as HTMLDivElement
  function repositionPanel() {
    const r = pinEl.getBoundingClientRect()
    let l = r.right + GAP
    if (l + W > window.innerWidth - MARGIN) l = r.left - W - GAP
    if (l < MARGIN) l = MARGIN
    let t = r.top - 40
    if (t < MARGIN) t = MARGIN
    if (t + 440 > window.innerHeight - MARGIN) t = window.innerHeight - 440 - MARGIN
    panel.style.left = `${l}px`
    panel.style.top  = `${t}px`
  }
  window.addEventListener('scroll', repositionPanel, { passive: true })

  function close() {
    window.removeEventListener('scroll', repositionPanel)
    document.removeEventListener('keydown', onEsc)
    host.remove()
  }
  function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', onEsc)
  shadow.getElementById('backdrop')!.addEventListener('click', close)
  shadow.getElementById('close-btn')!.addEventListener('click', close)
  shadow.getElementById('back-btn')!.addEventListener('click', () => {
    close()
    showPinDetail(comment, pinEl)
  })

  type ProfileComment = { comment_id: string; body: string; url: string; created_at: string }
  type ProfileResult  = {
    comments?:      ProfileComment[]
    contactStatus?: string
    followStatus?:  string
    isCurrentUser?: boolean
    error?: string
  }
  const res = await safeSendMessage({
    type: 'GET_USER_PROFILE',
    payload: { userId: comment.from_user_id },
  }) as ProfileResult

  const commentsList  = shadow.getElementById('comments-list')!
  const addContactBtn = shadow.getElementById('add-contact-btn') as HTMLButtonElement

  const SVG_EXT = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`

  if (!res || res.error) {
    commentsList.innerHTML = '<div id="empty-msg">Could not load.</div>'
  } else if (!res.comments || res.comments.length === 0) {
    commentsList.innerHTML = '<div id="empty-msg">No public comments.</div>'
  } else {
    commentsList.innerHTML = ''
    res.comments.forEach(c => {
      let domain = c.url
      try { domain = new URL(c.url).hostname } catch { /* keep raw */ }
      const el = document.createElement('div')
      el.className = 'comment-item'
      el.innerHTML = `
        <div class="ci-meta">
          <span class="ci-domain">${escapeHtml(domain)}</span>
          <span class="ci-arrow">${SVG_EXT}</span>
        </div>
        <div class="ci-body">${escapeHtml(c.body)}</div>
      `
      el.addEventListener('click', () => {
        safeSendMessage({
          type: 'NAVIGATE_TO_COMMENT',
          payload: { commentId: c.comment_id, url: c.url },
        })
      })
      commentsList.appendChild(el)
    })
  }

  if (res?.isCurrentUser) {
    addContactBtn.remove()
  } else if (res?.contactStatus === 'accepted') {
    addContactBtn.textContent = 'Already a contact ✓'
    addContactBtn.disabled = true
  } else if (res?.contactStatus === 'pending') {
    addContactBtn.textContent = 'Request sent'
    addContactBtn.disabled = true
  } else {
    addContactBtn.textContent = '+ Add to contacts'
    addContactBtn.disabled = false
    addContactBtn.addEventListener('click', async () => {
      addContactBtn.disabled = true
      addContactBtn.textContent = '…'
      const addRes = await safeSendMessage({
        type: 'ADD_CONTACT',
        payload: { addresseeId: comment.from_user_id! },
      }) as { success?: boolean; error?: string }
      if (addRes?.success) {
        addContactBtn.textContent = 'Request sent ✓'
        addContactBtn.classList.add('sent')
      } else {
        addContactBtn.textContent = '+ Add to contacts'
        addContactBtn.disabled = false
      }
    })
  }

  // Follow button (public mode only, not on own profile, not if already a contact)
  if (PUBLIC_MODE && !res?.isCurrentUser && comment.from_user_id && res?.contactStatus !== 'accepted') {
    const followBtn = document.createElement('button')
    followBtn.id = 'follow-btn'
    const footer = shadow.getElementById('footer')!
    footer.insertBefore(followBtn, addContactBtn.isConnected ? addContactBtn : null)

    if (res?.followStatus === 'following') {
      followBtn.innerHTML = `${SVG_FOLLOW} Following ✓`
      followBtn.classList.add('following')
      followBtn.disabled = true
    } else {
      followBtn.innerHTML = `${SVG_FOLLOW} Follow`
      followBtn.addEventListener('click', async () => {
        followBtn.disabled = true
        followBtn.textContent = '…'
        const r = await safeSendMessage({
          type: 'ADD_FOLLOW',
          payload: { followedId: comment.from_user_id! },
        }) as { success?: boolean }
        if (r?.success) {
          followBtn.innerHTML = `${SVG_FOLLOW} Following ✓`
          followBtn.classList.add('following')
        } else {
          followBtn.innerHTML = `${SVG_FOLLOW} Follow`
          followBtn.disabled = false
        }
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Pin overlay
// ---------------------------------------------------------------------------

let pinResizeHandler: (() => void) | null = null

function showPins(comments: CommentInboxItem[], targetCommentId?: string) {
  document.querySelectorAll('[data-webcomment-pin]').forEach(el => el.remove())
  document.getElementById('webcomment-detail-host')?.remove()
  pinMap.clear()
  if (pinResizeHandler) { window.removeEventListener('resize', pinResizeHandler); pinResizeHandler = null }
  if (comments.length === 0) return

  comments.forEach((comment, index) => {
    const pos = resolvePinPosition(comment)

    const pin = buildPinElement(comment)
    pinMap.set(pin, comment)
    pin.dataset.label = `${comment.from_username}: ${comment.body}`
    if (pos) {
      pin.style.left    = `${pos.docX}px`
      pin.style.top     = `${pos.docY}px`
    } else {
      pin.style.display = 'none'  // anchor not ready yet; interval will restore when ready
    }

    let tooltip: HTMLDivElement | null = null

    pin.addEventListener('mouseenter', () => {
      if (document.getElementById('webcomment-detail-host')) return
      const pos = resolvePinPosition(comment)
      if (!pos) return
      tooltip = document.createElement('div')
      Object.assign(tooltip.style, {
        position: 'absolute', left: `${pos.docX + 14}px`, top: `${pos.docY - 10}px`,
        background: '#1e293b', color: 'white', padding: '6px 10px',
        borderRadius: '6px', fontSize: '12px', maxWidth: '220px',
        zIndex: '2147483647', lineHeight: '1.4', pointerEvents: 'none',
      })
      tooltip.textContent = pin.dataset.label ?? ''
      document.body.appendChild(tooltip)
    })

    pin.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null })

    pin.addEventListener('click', e => {
      e.stopPropagation()
      tooltip?.remove(); tooltip = null
      showPinDetail(comment, pin)
    })

    document.body.appendChild(pin)

    pin.animate(
      [
        { opacity: '0', transform: 'translate(-50%, -50%) scale(0.35)' },
        { opacity: '1', transform: 'translate(-50%, -50%) scale(1)'    },
      ],
      { duration: 400, delay: index * 40, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' },
    )
  })

  // Recompute positions on each resize (debounce 80 ms)
  let resizeTimer: ReturnType<typeof setTimeout>
  pinResizeHandler = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(repositionPins, 80)
  }
  window.addEventListener('resize', pinResizeHandler)

  if (targetCommentId) {
    const target = comments.find(c => c.comment_id === targetCommentId)
    if (target) {
      const entry = [...pinMap.entries()].find(([, c]) => c.comment_id === targetCommentId)
      if (entry) {
        const [targetPin] = entry
        targetPin.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => showPinDetail(target, targetPin), 350)
      }
    }
  }

}

function repositionPins() {
  pinMap.forEach((comment, pin) => {
    const pos = resolvePinPosition(comment)
    if (!pos) { pin.style.display = 'none'; return }
    pin.style.display = 'flex'
    pin.style.left    = `${pos.docX}px`
    pin.style.top     = `${pos.docY}px`
  })
}

// ---------------------------------------------------------------------------
// Rich DOM path — anchor system
// ---------------------------------------------------------------------------

interface PathNode {
  tag:        string
  nth:        number
  id?:        string
  dataAttrs?: Record<string, string>
  role?:      string
  ariaLabel?: string
  classes?:   string[]
}

interface DomPath {
  nodes: PathNode[]
  text?: string
}

function isStableClass(cls: string): boolean {
  return !/\d{3,}/.test(cls) && !/^(css-|sc-|jss|mui|makeStyles|go-)/.test(cls)
}

function isGeneratedId(id: string): boolean {
  return /:\w+:/.test(id) || /^:/.test(id) || /^\d+$/.test(id)
}

function buildPathNode(el: Element): PathNode {
  const tag    = el.tagName.toLowerCase()
  const parent = el.parentElement
  const nth    = parent
    ? Array.from(parent.children).filter(s => s.tagName === el.tagName).indexOf(el) + 1
    : 1
  const node: PathNode = { tag, nth }

  if (el.id && !isGeneratedId(el.id)) node.id = el.id

  for (const attr of ['data-testid', 'data-cy', 'data-qa', 'data-id', 'data-key', 'data-name']) {
    const val = el.getAttribute(attr)
    if (val) node.dataAttrs = { ...node.dataAttrs, [attr]: val }
  }

  const role = el.getAttribute('role')
  if (role) node.role = role

  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) node.ariaLabel = ariaLabel

  const stableClasses = Array.from(el.classList).filter(isStableClass)
  if (stableClasses.length) node.classes = stableClasses.slice(0, 5)

  return node
}

function getDomPath(el: Element): DomPath {
  const MAX_DEPTH = 15
  const nodes: PathNode[] = []
  let cur: Element | null = el

  for (let d = 0; d < MAX_DEPTH && cur && cur !== document.documentElement; d++) {
    const node = buildPathNode(cur)
    nodes.unshift(node)
    if (node.id) break
    cur = cur.parentElement
  }

  const text = (el as HTMLElement).innerText?.trim().slice(0, 80) || undefined
  return { nodes, text }
}

function scoreNode(el: Element, node: PathNode): number {
  if (node.id && el.id !== node.id) return 0

  let score = node.id ? 100 : 0

  if (node.dataAttrs) {
    for (const [k, v] of Object.entries(node.dataAttrs)) {
      if (el.getAttribute(k) === v) score += 50
    }
  }
  if (node.role      && el.getAttribute('role')       === node.role)      score += 20
  if (node.ariaLabel && el.getAttribute('aria-label') === node.ariaLabel) score += 20
  for (const cls of node.classes ?? []) {
    if (el.classList.contains(cls)) score += 10
  }
  const parent = el.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(s => s.tagName === el.tagName)
    if (siblings.indexOf(el) + 1 === node.nth) score += 5
  }
  return score + 1
}

function findElementByPath(path: DomPath): Element | null {
  const { nodes, text } = path
  if (!nodes.length) return null

  const first = nodes[0]
  let candidates: Element[]

  if (first.id) {
    const el = document.getElementById(first.id)
    candidates = el ? [el] : []
  } else {
    candidates = Array.from(document.querySelectorAll(first.tag))
      .filter(el => scoreNode(el, first) > 1)
  }

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i]
    const next: Element[] = []
    for (const parent of candidates) {
      const children = Array.from(parent.children)
        .filter(c => c.tagName.toLowerCase() === node.tag)
      const scored = children
        .map(c => ({ el: c, score: scoreNode(c, node) }))
        .filter(s => s.score > 1)
      if (scored.length) {
        scored.sort((a, b) => b.score - a.score)
        next.push(scored[0].el)
      }
    }
    candidates = next
    if (!candidates.length) return null
  }

  // Text fingerprint: mandatory validation, not just a tie-breaker.
  // Prevents returning a structurally-similar element from a different SPA view.
  // If a fingerprint was captured and no candidate has matching text → wrong view → null.
  if (text) {
    const fingerprint = text.slice(0, 40)
    return candidates.find(el =>
      (el as HTMLElement).innerText?.trim().slice(0, 40) === fingerprint
    ) ?? null
  }

  return candidates[0] ?? null
}

function isElVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  if (!(el as HTMLElement).checkVisibility?.()) return false
  return true
}

function resolvePinPosition(comment: CommentInboxItem): { docX: number; docY: number } | null {
  if (comment.anchor_path) {
    try {
      const path: DomPath = JSON.parse(comment.anchor_path)
      const el = findElementByPath(path)
      if (!el || !isElVisible(el)) return null
      const rect = el.getBoundingClientRect()
      return {
        docX: rect.left + window.scrollX + ((comment.anchor_x ?? 50) / 100) * rect.width,
        docY: rect.top  + window.scrollY + ((comment.anchor_y ?? 50) / 100) * rect.height,
      }
    } catch { return null }
  }
  // Legacy CSS selector fallback for old comments
  if (comment.anchor_selector) {
    try {
      const el = document.querySelector(comment.anchor_selector)
      if (!el || !isElVisible(el)) return null
      const rect = el.getBoundingClientRect()
      return {
        docX: rect.left + window.scrollX + ((comment.anchor_x ?? 50) / 100) * rect.width,
        docY: rect.top  + window.scrollY + ((comment.anchor_y ?? 50) / 100) * rect.height,
      }
    } catch { return null }
  }
  return {
    docX: (comment.pin_x / 100) * window.innerWidth  + window.scrollX,
    docY: (comment.pin_y / 100) * window.innerHeight + window.scrollY,
  }
}

// ---------------------------------------------------------------------------
// Error screen
// ---------------------------------------------------------------------------

function showErrorScreen(comment: CommentInboxItem) {
  const render = () => {
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      background: '#f8fafc', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    })
    overlay.innerHTML = `
      <div style="max-width:560px;padding:2rem;text-align:center">
        <div style="color:#2563EB;font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">WebComment</div>
        <p style="color:#475569;margin-bottom:0.25rem;font-size:0.9rem">
          <strong>${escapeHtml(comment.from_username)}</strong> shared something on this page with you.
        </p>
        <p style="color:#94a3b8;font-size:0.8rem;margin-bottom:1.5rem">
          You don't have access — here's what they were seeing:
        </p>
        <div style="position:relative;display:inline-block;border-radius:9px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)">
          <img src="${escapeHtml(comment.screenshot_url)}" style="max-width:100%;display:block" />
          <div style="position:absolute;left:${comment.pin_x}%;top:${comment.pin_y}%;
            width:20px;height:20px;border-radius:50%;background:#2563EB;border:2px solid white;
            transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
        </div>
        <p style="margin-top:1.5rem;color:#1e293b;font-style:italic;font-size:0.9rem">
          "${escapeHtml(comment.body)}"
        </p>
        <p style="color:#94a3b8;font-size:0.8rem;margin-top:0.25rem">— ${escapeHtml(comment.from_username)}</p>
      </div>
    `
    document.body.appendChild(overlay)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true })
  } else {
    render()
  }
}

// ---------------------------------------------------------------------------
// Share context
// ---------------------------------------------------------------------------

async function checkShareContext() {
  const storageKey = `share:${location.href}`
  const result     = await chrome.storage.local.get(storageKey)
  const context    = result[storageKey] as ShareContext | undefined
  if (!context) return

  showShareBanner(context)
}

function showShareBanner(context: ShareContext) {
  if (document.getElementById('webcomment-share-banner')) return
  const banner = document.createElement('div')
  banner.id    = 'webcomment-share-banner'
  Object.assign(banner.style, {
    position: 'fixed', bottom: '16px', right: '16px',
    background: '#2563EB', color: 'white', padding: '10px 14px',
    borderRadius: '8px', fontSize: '13px', zIndex: '2147483646',
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)', cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  })
  banner.textContent = `WebComment · Your comments will go to ${escapeHtml(context.recipient_name)}`
  setTimeout(() => banner.remove(), 5000)
  document.body.appendChild(banner)
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function showToast(msg: string, withCheck = false) {
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: '#1e293b', color: 'white', padding: '10px 18px',
    borderRadius: '8px', fontSize: '13px', zIndex: '2147483647',
    fontFamily: 'system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '6px',
  })
  if (withCheck) {
    const icon = document.createElement('span')
    icon.innerHTML = SVG_CHECK
    el.appendChild(icon)
  }
  el.appendChild(document.createTextNode(msg))
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function renderTaggedBody(text: string, mentions: { id: string; username: string }[] = []): string {
  const map      = new Map(mentions.map(m => [m.id, m.username]))
  const resolved = text.replace(/@\[([0-9a-f-]{36})\]/g, (_, id) => `@${map.get(id) ?? '[unknown]'}`)
  return escapeHtml(resolved)
    .replace(/#([A-Za-z0-9_]+)/g,  '<span style="color:#2563EB;font-weight:500;">#$1</span>')
    .replace(/@([A-Za-z0-9_]+)/g,  '<span style="color:#7C3AED;font-weight:500;">@$1</span>')
}

} // end init()
