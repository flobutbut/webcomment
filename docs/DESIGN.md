# Design System — WebComment

Style: simple, modern, frictionless. In the vein of current digital tools (Linear, Notion, Raycast).

---

## Principles

- **White dominant** — the background never distracts from the content
- **Blue for action** — a single accent color, reserved for CTAs and active states
- **Readable typography** — generous size, strong contrast
- **Controlled density** — the popup is small (360 × 560 px); every pixel counts
- **No gratuitous decoration** — no excessive drop shadows, no gradients, no icons without purpose

---

## Palette

### Base

| Name         | Value     | Usage                                      |
|--------------|-----------|--------------------------------------------|
| `white`      | `#FFFFFF` | Main background, cards                     |
| `gray-50`    | `#F9FAFB` | Alternating background (list, light hover) |
| `gray-100`   | `#F3F4F6` | Dividers, disabled field background        |
| `gray-300`   | `#D1D5DB` | Borders                                    |
| `gray-500`   | `#6B7280` | Secondary text, placeholders               |
| `gray-900`   | `#111827` | Primary text                               |

### Action (blue)

| Name          | Value     | Usage                                     |
|---------------|-----------|-------------------------------------------|
| `blue-500`    | `#3B82F6` | Active icons, links                       |
| `blue-600`    | `#2563EB` | Primary button (normal state)             |
| `blue-700`    | `#1D4ED8` | Primary button (hover/pressed state)      |
| `blue-50`     | `#EFF6FF` | Selected element background / badge       |
| `blue-100`    | `#DBEAFE` | Recipient tag background                  |

### Semantic

| Name        | Value     | Usage                    |
|-------------|-----------|--------------------------|
| `red-500`   | `#EF4444` | Error, alert             |
| `green-500` | `#22C55E` | Success, confirmed send  |

---

## Typography

System font (native, no external loading):

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

| Role              | Size    | Weight  | Color        |
|-------------------|---------|---------|--------------|
| Popup title       | 14px    | 600     | `gray-900`   |
| Body text         | 13px    | 400     | `gray-900`   |
| Secondary text    | 12px    | 400     | `gray-500`   |
| Button label      | 13px    | 500     | —            |
| Timestamp         | 11px    | 400     | `gray-500`   |

---

## Spacing

Base grid: **4 px**.

| Token | Value  | Typical usage              |
|-------|--------|----------------------------|
| `1`   | 4px    | Internal icon              |
| `2`   | 8px    | Compact internal padding   |
| `3`   | 12px   | Standard padding           |
| `4`   | 16px   | Generous padding           |
| `6`   | 24px   | Section                    |

---

## Components

### Popup

- Fixed dimensions: **360 × 560 px**
- Structure: fixed header + tabs + scrollable area + fixed footer

```
┌──────────────────────────────┐  ← 360px
│ Header  [Pins] [👤●]         │  ← 48px, white bg, gray-100 bottom border
│                              │     Pins = pill toggle (blue-50 when active)
│                              │     👤 = user icon button (red badge for pending contacts)
├──────────────────────────────┤
│ Tabs Inbox / My comments     │  ← flex-shrink-0
├──────────────────────────────┤
│                              │
│ Scrollable area              │  ← flex-1, overflow-y-auto
│                              │
├──────────────────────────────┤
│ Footer (New comment + link)  │  ← flex-shrink-0, px-4 py-3, top border
│                              │     Button: "+ New comment  Alt+Shift+N"
│                              │     Link: "↗ Open web app" (gray-400, hover blue-500)
└──────────────────────────────┘  ← 560px total
```

> The layout requires `html, body, #root { height: 100% }` for `h-full` on the App to work and the footer to stay pinned to the bottom.

### Buttons — `Button` component

All full-width action buttons go through `popup/components/Button.tsx`.

| Variant | Style | Usage |
|---------|-------|-------|
| `primary` (default) | `bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800` | Primary CTA |
| `secondary` | `border border-gray-200 text-gray-600 hover:bg-gray-50` | Secondary action |
| `danger` | `border border-red-200 text-red-500 hover:bg-red-50` | Soft destructive (sign out) |
| `danger-filled` | `bg-red-500 text-white hover:bg-red-600` | Strong destructive (delete) |

```tsx
import { Button } from '../components/Button'

<Button variant="secondary" onClick={…} className="flex items-center gap-1.5">
  Open page <Icon icon={arrowRightIcon} width={14} height={14} />
</Button>
```

Specialized buttons (header, navigation, icon-only) remain plain `<button>` elements with their own classes.

### Text field

```
w-full  px-3 py-2  rounded-lg  text-[13px]
border border-gray-300  bg-white  text-gray-900
placeholder:text-gray-400
focus:outline-none  focus:ring-2  focus:ring-blue-500/40  focus:border-blue-500
```

### @username mention (in-page composer)

Mentions are typed directly in the textarea and rendered as plain text. The @mention dropdown follows the inbox item style:

```css
/* dropdown */
border-top: 1px solid #f1f5f9;
background: #fff; max-height: 160px; overflow-y: auto;

/* item */
display: flex; align-items: center; gap: 8px; padding: 8px 14px;
/* .at-name */  font-size: 13px; font-weight: 500; color: #1e293b;
/* .at-email */ font-size: 12px; color: #94a3b8;
/* :hover / .active */ background: #f1f5f9;
```

### Toggle switch (public mode)

```css
/* label */   display: flex; align-items: center; gap: 6px; cursor: pointer;
              font-size: 12px; color: #94a3b8;  /* active: #2563EB */
/* pill */    width: 30px; height: 17px; border-radius: 9px;
              background: #cbd5e1;  /* active: #2563EB */
/* thumb */   width: 13px; height: 13px; border-radius: 50%; background: #fff;
              transition: left 0.2s;  /* inactive: left 2px, active: left 15px */
```

### Inbox item

```
px-4 py-3  border-b border-gray-100
hover:bg-gray-50  cursor-pointer  transition-colors duration-100

• Unread indicator: blue-500 dot (8px) on the left
• Username:  text-[13px] font-semibold gray-900
• URL:       text-[11px] gray-500  truncate
• Excerpt:   text-[12px] gray-700  line-clamp-1
• Time:      text-[11px] gray-400  ml-auto
```

### Pin (page overlay)

Circle 28 px, `border-2 border-white`, `box-shadow 0 2px 8px rgba(0,0,0,0.28)`.

Content (by priority):
1. **Avatar** — `<img>` `object-fit: cover` if `from_avatar_url` is set
2. **Initials** — 2 letters in white, deterministic colored background based on `username`

The initials color is drawn from a palette of 8 colors via a simple hash of the username (function `avatarColor()` in `content.ts`) — guarantees the same user always has the same color.

```
Initials palette: #2563EB #7C3AED #DB2777 #DC2626 #D97706 #059669 #0891B2 #4F46E5
```

### Detail panel (page overlay)

296 px wide, Shadow DOM, anchored to the pin, repositioned on scroll.

Action buttons (12 px, 500 weight, `border-radius: 7px`, `padding: 5px 10px`):

| Button | Class | Background | Text |
|--------|-------|-----------|------|
| Dismiss | `.dismiss` | `#f1f5f9` | `#475569` |
| Profil | `.profile` | `#eff6ff` | `#2563EB` |
| Delete | `.delete` | `#fff1f2` | `#ef4444` |

Username in the header has `cursor: pointer` + blue hover when `from_user_id` is non-null — opens the profile overlay.

### Profile overlay (page overlay)

Same dimensions and shadow as the detail panel. Opens from the "Profil" button or the username click in the detail panel.

Header: back arrow (←) + centered "Profil" label + ✕ close button.

Profile section: 40 px centered avatar + `@username` (14 px, 600 weight).

Public comments list:
```css
/* item */
.comment-item { border-radius: 6px; background: #f8fafc; cursor: pointer;
                border: 1px solid transparent; transition: background, border-color 0.1s; }
.comment-item:hover { background: #eff6ff; border-color: #bfdbfe; }
/* domain row */
.ci-domain { font-size: 11px; font-weight: 600; color: #2563EB; }
/* body row */
.ci-body { font-size: 12px; color: #475569; white-space: nowrap; text-overflow: ellipsis; }
```

Footer: full-width "Ajouter aux contacts" button (`#2563EB` → green on success) + 11 px gray CTA text.

---

## Icons

Library: **Iconify** — offline rendering, tree-shakeable, no network call (CSP-compatible with Chrome Extension MV3).

```bash
# Installed packages
@iconify/react          # React <Icon /> component
@iconify-icons/lucide   # Lucide set (thin stroke, consistent with the palette)
```

### Usage in React components (popup)

```tsx
import { Icon } from '@iconify/react'
import checkIcon from '@iconify-icons/lucide/check'

<Icon icon={checkIcon} width={16} height={16} />
```

Standard size: **16 px** — adjust with `width` / `height` as needed.  
Color: inherited from parent CSS `color` (`currentColor`).

### Usage in the content script

The content script is vanilla TypeScript (no React). Icons are SVG strings defined as module-level constants in `content.ts` and injected via `innerHTML`:

```ts
const SVG_X     = `<svg ...>...</svg>`   // close / delete
const SVG_SEND  = `<svg ...>...</svg>`   // send
const SVG_CHECK = `<svg ...>...</svg>`   // toast confirmation
```

> Always use `escapeHtml()` for user content before injecting via `innerHTML`.

### Icon catalogue

| Icon | Import | Context |
|-------|--------|----------|
| `lucide:check` | `@iconify-icons/lucide/check` | Copy link confirmation |
| `lucide:arrow-up-right` | `@iconify-icons/lucide/arrow-up-right` | Share button |
| `lucide:map-pin` | `@iconify-icons/lucide/map-pin` | Pins active |
| `lucide:map-pin-off` | `@iconify-icons/lucide/map-pin-off` | Pins hidden |
| `lucide:settings` | `@iconify-icons/lucide/settings` | Settings |
| `lucide:plus` | `@iconify-icons/lucide/plus` | New comment |
| `lucide:arrow-left` | `@iconify-icons/lucide/arrow-left` | Back (Inbox, Sent) |
| `lucide:arrow-right` | `@iconify-icons/lucide/arrow-right` | Open page |
| `lucide:trash-2` | `@iconify-icons/lucide/trash-2` | Delete comment |
| SVG inline | `SVG_X` in content.ts | Close the composer / panels |
| SVG inline | `SVG_SEND` in content.ts | Send button (composer) |
| SVG inline | `SVG_CHECK` in content.ts | Send confirmation toast / Dismiss button |
| SVG inline | `SVG_GLOBE` in content.ts | Public mode indicator |
| SVG inline | `SVG_TRASH` in content.ts | Delete button (detail panel) |
| SVG inline | `SVG_RESOLVE` in content.ts | Resolve/Dismiss button icon |
| SVG inline | `SVG_BACK` in content.ts | Back button (profile overlay) |
| SVG inline | `SVG_USER` in content.ts | "Profil" button (detail panel) |

---

## Behaviors

- **Transitions**: `duration-150` for interactive states (hover, focus), `duration-200` for panel enter/exit
- **No decorative animation** — only to indicate a state change
- **Loading**: `animate-spin` blue-600 spinner, centered, no opaque background
- **Empty states**: short centered message in `gray-400`, Lucide icon above

---

## Tailwind — key configuration

```ts
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Nothing to extend: using Tailwind's default values.
      // The fixed popup is handled by width/height in global CSS.
    },
  },
}
```

```css
/* src/popup/index.css */
html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  width: 360px;
  height: 560px;
  overflow: hidden;
}
```
