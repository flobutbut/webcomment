import type { Message } from '../shared/messages'
import type { CommentInboxItem, ShareContext } from '../shared/types'
import { avatarColor, avatarInitials } from '../shared/utils'

const PUBLIC_MODE = import.meta.env.VITE_PUBLIC_MODE_ENABLED !== 'false'

// Inline Lucide SVGs — used in the Shadow DOM (no React available here)
const SVG_X    = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
const SVG_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`
const SVG_CHECK  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const SVG_GLOBE   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
const SVG_TRASH   = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`
const SVG_RESOLVE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`


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
  chrome.runtime.sendMessage({ type: 'ACTIVATE_PIN_PICKER' })
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
chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => { /* SW not yet awake, onUpdated will retry */ })

checkShareContext()

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

  // DOM anchor: selector of clicked element + offset inside it
  const target          = e.target as Element
  const anchor_selector = getSelector(target)
  const rect            = target.getBoundingClientRect()
  const anchor_x        = rect.width  > 0 ? ((e.clientX - rect.left) / rect.width)  * 100 : 50
  const anchor_y        = rect.height > 0 ? ((e.clientY - rect.top)  / rect.height) * 100 : 50

  // Capture screenshot before showing the overlay
  const res = await chrome.runtime.sendMessage({
    type: 'PREPARE_CAPTURE',
    payload: { x, y, anchor_selector, anchor_x, anchor_y },
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
        padding: 2px 4px; border-radius: 4px; transition: color 0.1s;
      }
      #close:hover { color: #475569; }

      #at-dropdown { border-top: 1px solid #f1f5f9; background: #fff; max-height: 160px; overflow-y: auto; display: none; }
      .at-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; transition: background 0.1s; }
      .at-item:hover, .at-item.active { background: #f1f5f9; }
      .at-name { font-size: 13px; font-weight: 500; color: #1e293b; }
      .at-email { font-size: 12px; color: #94a3b8; }

      #body-area { padding: 10px 14px; }
      #message-input {
        width: 100%; border: 1px solid #e2e8f0; border-radius: 7px;
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
        background: none; border: 1px solid #e2e8f0; border-radius: 7px;
        padding: 6px 12px; font-size: 12px; color: #64748b; cursor: pointer;
        font-family: inherit; transition: background 0.1s;
      }
      #cancel:hover { background: #f8fafc; }
      #send {
        background: #2563EB; color: #fff; border: none; border-radius: 7px;
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
        <button id="cancel">Cancel</button>
        <button id="send" style="display:flex;align-items:center;gap:5px;">Send ${SVG_SEND}</button>
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
  let isPublic = false
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
  // @mention in textarea
  // ------------------------------------------------------------------

  let atUsers:     { id: string; username: string; email: string }[] = []
  let atActiveIdx  = -1
  let atStart      = 0
  let atTimer:     ReturnType<typeof setTimeout>

  function closeAt() {
    atDropdown.style.display = 'none'
    atDropdown.innerHTML     = ''
    atUsers     = []
    atActiveIdx = -1
  }

  function renderAt() {
    atDropdown.innerHTML = ''
    atActiveIdx = -1
    if (!atUsers.length) { closeAt(); return }
    atUsers.forEach((u, i) => {
      const item = document.createElement('div')
      item.className = 'at-item'
      item.innerHTML = `<span class="at-name">@${escapeHtml(u.username)}</span><span class="at-email">${escapeHtml(u.email)}</span>`
      item.addEventListener('mousedown', e => { e.preventDefault(); insertAt(u) })
      atDropdown.appendChild(item)
    })
    atDropdown.style.display = 'block'
  }

  function updateAtActive() {
    atDropdown.querySelectorAll('.at-item').forEach((el, i) => {
      el.classList.toggle('active', i === atActiveIdx)
    })
  }

  function insertAt(u: { id: string; username: string; email: string }) {
    const cursor = msgInput.selectionStart ?? 0
    const before = msgInput.value.slice(0, atStart)
    const after  = msgInput.value.slice(cursor)
    msgInput.value = before + `@${u.username} ` + after
    const pos = atStart + u.username.length + 2
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
      const res = await chrome.runtime.sendMessage({
        type: 'SEARCH_USERS', payload: { query },
      }) as { users?: { id: string; username: string; email: string }[] }
      atUsers = res?.users ?? []
      renderAt()
    }, 200)
  })

  msgInput.addEventListener('keydown', e => {
    if (atDropdown.style.display !== 'none' && atUsers.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        atActiveIdx = Math.min(atActiveIdx + 1, atUsers.length - 1)
        updateAtActive(); return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        atActiveIdx = Math.max(atActiveIdx - 1, 0)
        updateAtActive(); return
      } else if (e.key === 'Enter') {
        e.preventDefault()
        insertAt(atUsers[atActiveIdx >= 0 ? atActiveIdx : 0]); return
      } else if (e.key === 'Escape') {
        closeAt(); return
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
  })

  msgInput.addEventListener('blur', () => setTimeout(closeAt, 150))

  // Send
  sendBtn.addEventListener('click', send)

  async function send() {
    const body = msgInput.value.trim()
    if (!body) { statusEl.textContent = 'Write a message.'; return }

    // Resolve @mentions in the message body
    const mentionedNames = [...new Set(
      [...body.matchAll(/@([A-Za-z0-9_]+)/g)].map(m => m[1].toLowerCase())
    )]

    const mentionedIds: { type: 'user'; id: string }[] = []
    for (const name of mentionedNames) {
      const res = await chrome.runtime.sendMessage({
        type: 'SEARCH_USERS', payload: { query: name },
      }) as { users?: { id: string; username: string; email: string }[] }
      const found = res?.users?.find(u => u.username.toLowerCase() === name)
      if (found) mentionedIds.push({ type: 'user', id: found.id })
    }

    const to: ({ type: 'public' } | { type: 'user'; id: string })[] = [
      ...(isPublic ? [{ type: 'public' as const }] : []),
      ...mentionedIds,
    ]

    // No recipient and not public → personal note
    if (!to.length) {
      const sessionRes = await chrome.runtime.sendMessage({ type: 'GET_SESSION' }) as { session?: { user: { id: string } } }
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

    const res = await chrome.runtime.sendMessage({
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

  const sessionRes    = await chrome.runtime.sendMessage({ type: 'GET_SESSION' }) as { session?: { user: { id: string } } }
  const currentUserId = sessionRes?.session?.user?.id

  const recipientId = (comment as CommentInboxItem & { recipient_id?: string }).recipient_id
  const canResolve  = !!recipientId && !comment.resolved_at
  const canDelete   = !!currentUserId && comment.from_user_id === currentUserId
  const hasActions  = canResolve || canDelete

  const pinRect = pinEl.getBoundingClientRect()
  const W = 296, GAP = 12, MARGIN = 10
  let left = pinRect.right + GAP
  if (left + W > window.innerWidth - MARGIN) left = pinRect.left - W - GAP
  if (left < MARGIN) left = MARGIN
  let top = pinRect.top - 40
  if (top < MARGIN) top = MARGIN
  if (top + 380 > window.innerHeight - MARGIN) top = window.innerHeight - 380 - MARGIN

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
      #meta { flex: 1; min-width: 0; }
      #username { font-size: 12px; font-weight: 600; color: #1e293b; }
      #date { font-size: 11px; color: #94a3b8; margin-top: 1px; }
      #close-btn {
        background: none; border: none; cursor: pointer; color: #94a3b8;
        padding: 2px; border-radius: 4px; display: flex; align-items: center;
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
        border: none; border-radius: 7px; cursor: pointer;
        padding: 5px 10px; font-size: 12px; font-weight: 500;
        font-family: inherit; display: flex; align-items: center; gap: 4px;
        transition: background 0.1s;
      }
      button.resolve { background: #eff6ff; color: #2563EB; }
      button.resolve:hover:not(:disabled) { background: #dbeafe; }
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
        flex: 1; border: 1px solid #e2e8f0; background: none; border-radius: 7px;
        padding: 5px 10px; font-size: 12px; color: #64748b; cursor: pointer;
        font-family: inherit; transition: background 0.1s;
      }
      button.confirm-cancel:hover { background: #f8fafc; }
      button.confirm-delete {
        flex: 1; border: none; background: #ef4444; color: #fff; border-radius: 7px;
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
        <button id="close-btn">${SVG_X}</button>
      </div>
      <div id="body-text">${renderTaggedBody(comment.body)}</div>
      ${hasActions ? `
      <div id="actions">
        ${canResolve ? `<button class="action resolve" id="resolve-btn">${SVG_RESOLVE} Resolve</button>` : ''}
        ${canDelete  ? `<button class="action delete"  id="delete-btn">${SVG_TRASH} Delete</button>`  : ''}
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
    host.remove()
  }
  backdrop.addEventListener('click', close)
  closeBtn.addEventListener('click', close)

  const resolveBtn     = shadow.getElementById('resolve-btn')     as HTMLButtonElement | null
  const deleteBtn      = shadow.getElementById('delete-btn')      as HTMLButtonElement | null
  const confirmArea    = shadow.getElementById('confirm-area')
  const confirmCancel  = shadow.getElementById('confirm-cancel')  as HTMLButtonElement | null
  const confirmDelete  = shadow.getElementById('confirm-delete')  as HTMLButtonElement | null

  resolveBtn?.addEventListener('click', async () => {
    resolveBtn.disabled = true
    const res = await chrome.runtime.sendMessage({
      type: 'RESOLVE_COMMENT',
      payload: { recipientId: recipientId! },
    }) as { error?: string }
    if (!res?.error) {
      showToast('Comment resolved', true)
      close()
    } else {
      resolveBtn.disabled = false
    }
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
    const res = await chrome.runtime.sendMessage({
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
    const { docX, docY } = resolvePinPosition(comment)

    const pin = buildPinElement(comment)
    pinMap.set(pin, comment)
    pin.dataset.anchorSelector = comment.anchor_selector ?? ''
    pin.dataset.anchorX        = String(comment.anchor_x ?? 50)
    pin.dataset.anchorY        = String(comment.anchor_y ?? 50)
    pin.dataset.pinX           = String(comment.pin_x)
    pin.dataset.pinY           = String(comment.pin_y)
    pin.dataset.label          = `${comment.from_username}: ${comment.body}`
    pin.style.left             = `${docX}px`
    pin.style.top              = `${docY}px`

    let tooltip: HTMLDivElement | null = null

    pin.addEventListener('mouseenter', () => {
      if (document.getElementById('webcomment-detail-host')) return
      const pos = getPinDocPosition(pin)
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
  document.querySelectorAll<HTMLElement>('[data-webcomment-pin]').forEach(pin => {
    const { docX, docY } = getPinDocPosition(pin)
    pin.style.left = `${docX}px`
    pin.style.top  = `${docY}px`
  })
}

function getPinDocPosition(pin: HTMLElement): { docX: number; docY: number } {
  const selector = pin.dataset.anchorSelector ?? ''
  const anchorX  = parseFloat(pin.dataset.anchorX ?? '50')
  const anchorY  = parseFloat(pin.dataset.anchorY ?? '50')
  const pinX     = parseFloat(pin.dataset.pinX ?? '50')
  const pinY     = parseFloat(pin.dataset.pinY ?? '50')

  if (selector) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        return {
          docX: rect.left + window.scrollX + (anchorX / 100) * rect.width,
          docY: rect.top  + window.scrollY + (anchorY / 100) * rect.height,
        }
      }
    } catch { /* invalid selector → fallback */ }
  }
  return {
    docX: (pinX / 100) * window.innerWidth,
    docY: (pinY / 100) * window.innerHeight,
  }
}

function resolvePinPosition(comment: CommentInboxItem): { docX: number; docY: number } {
  if (comment.anchor_selector) {
    try {
      const el = document.querySelector(comment.anchor_selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        return {
          docX: rect.left + window.scrollX + ((comment.anchor_x ?? 50) / 100) * rect.width,
          docY: rect.top  + window.scrollY + ((comment.anchor_y ?? 50) / 100) * rect.height,
        }
      }
    } catch { /* invalid selector → fallback */ }
  }
  return {
    docX: (comment.pin_x / 100) * window.innerWidth,
    docY: (comment.pin_y / 100) * window.innerHeight,
  }
}

// Generate a stable, minimal CSS selector for an element
function getSelector(el: Element): string {
  const MAX_DEPTH = 6
  const parts: string[] = []
  let current: Element | null = el

  for (let depth = 0; depth < MAX_DEPTH && current && current !== document.documentElement; depth++) {
    if (current.id && !/^\d/.test(current.id)) {
      parts.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    const tag    = current.tagName.toLowerCase()
    const parent = current.parentElement

    if (!parent || current === document.body) {
      parts.unshift(tag)
      break
    }

    const siblings = Array.from(parent.children).filter(s => s.tagName === current!.tagName)
    if (siblings.length > 1) {
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current as Element) + 1})`)
    } else {
      parts.unshift(tag)
    }

    current = parent
  }

  return parts.join(' > ')
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
        <div style="position:relative;display:inline-block;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)">
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
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderTaggedBody(text: string): string {
  return escapeHtml(text).replace(
    /#([A-Za-z0-9_]+)/g,
    '<span style="color:#2563EB;font-weight:500;">#$1</span>',
  )
}

} // end init()
