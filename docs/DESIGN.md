# Design System — WebComment

Style: simple, modern, frictionless. In the vein of current digital tools (Linear, Notion, Raycast).

---

## Principles

- **White dominant** — the background never distracts from the content (extension)
- **Dark dominant** — near-black surfaces with subtle borders (webapp)
- **Blue for action** — a single accent color, reserved for CTAs and active states
- **Readable typography** — generous size, strong contrast
- **Controlled density** — the popup is small (360 × 560 px); every pixel counts
- **No gratuitous decoration** — no excessive drop shadows, no gradients, no icons without purpose

---

## Palette

### Extension — light theme

| Name         | Value     | Usage                                      |
|--------------|-----------|--------------------------------------------|
| `white`      | `#FFFFFF` | Main background, cards                     |
| `gray-50`    | `#F9FAFB` | Alternating background (list, light hover) |
| `gray-100`   | `#F3F4F6` | Dividers, disabled field background        |
| `gray-200`   | `#E5E7EB` | Borders                                    |
| `gray-400`   | `#9CA3AF` | Timestamps, icon-only button default       |
| `gray-500`   | `#6B7280` | Secondary text, placeholders               |
| `gray-600`   | `#4B5563` | Secondary button text                      |
| `gray-900`   | `#111827` | Primary text                               |

### Webapp — dark theme tokens (`webapp/src/index.css`)

| Token                    | Value     | Usage                        |
|--------------------------|-----------|------------------------------|
| `--color-dark-950`       | `#050505` | Deepest background           |
| `--color-dark-900`       | `#080808` | Page background              |
| `--color-dark-850`       | `#0a0a0a` | Scrollbar track, input bg    |
| `--color-dark-800`       | `#0c0c0c` | Input/form field background  |
| `--color-dark-700`       | `#0f0f0f` | —                            |
| `--color-dark-600`       | `#111111` | —                            |
| `--color-dark-hover`     | `#1a1a1a` | Hover state background       |
| `--color-dark-subtle`    | `#1c1c1c` | Subtle surface               |
| `--color-dark-border-xs` | `#141414` | Hairline border              |
| `--color-dark-border-sm` | `#1e1e1e` | Subtle border                |
| `--color-dark-border`    | `#222222` | Standard border              |
| `--color-dark-border-md` | `#252525` | Medium border                |
| `--color-dark-border-lg` | `#2a2a2a` | Strong border                |
| `--color-dark-border-xl` | `#333333` | Prominent border             |

### Action (shared)

| Name          | Value     | Usage                                     |
|---------------|-----------|-------------------------------------------|
| `blue-500`    | `#3B82F6` | Active icons, links, focus ring           |
| `blue-600`    | `#2563EB` | Primary button, active states             |
| `blue-700`    | `#1D4ED8` | Primary button hover                      |
| `blue-800`    | `#1E40AF` | Primary button active/pressed             |
| `blue-50`     | `#EFF6FF` | Selected element background               |
| `blue-100`    | `#DBEAFE` | Recipient tag background                  |

### Semantic (shared)

| Name          | Value     | Usage                              |
|---------------|-----------|------------------------------------|
| `red-400`     | `#F87171` | Danger outline text (webapp)       |
| `red-500`     | `#EF4444` | Error, alert, danger icon hover    |
| `red-600`     | `#DC2626` | Danger filled button (webapp)      |
| `green-600`   | `#16A34A` | Success border and text            |
| `green-700`   | `#15803D` | Success text (webapp)              |

---

## Typography

System font (native, no external loading):

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Extension popup

| Role              | Size    | Weight | Color      |
|-------------------|---------|--------|------------|
| Popup title       | 14px    | 600    | `gray-900` |
| Body text         | 13px    | 400    | `gray-900` |
| Secondary text    | 12px    | 400    | `gray-500` |
| Button label      | 13px    | 500    | —          |
| Small button      | 11px    | 400–500| —          |
| Timestamp         | 11px    | 400    | `gray-400` |

### Webapp dashboard

| Role              | Size  | Weight | Color        |
|-------------------|-------|--------|--------------|
| Section heading   | xs    | 600    | `gray-400`   |
| Body text         | sm    | 400    | `gray-900`   |
| Secondary text    | xs    | 400    | `gray-400–500`|
| Button label      | xs–sm | 500–600| —            |

---

## Border radius

Base: **6px** for all interactive elements (buttons, inputs). Shared token scale in `@theme` — applies to both extension and webapp.

| Token           | Value  | Class          | Usage                                           |
|-----------------|--------|----------------|-------------------------------------------------|
| `--radius-0`    | 0px    | `rounded-0`    | Sharp / no rounding                             |
| `--radius-3`    | 3px    | `rounded-3`    | Badges, chips, favicons, icon-button hit area   |
| `--radius-6`    | 6px    | `rounded-6`    | **Base** — buttons, inputs, nav items           |
| `--radius-9`    | 9px    | `rounded-9`    | Grouped inputs, search bars, segmented controls, screenshot containers |
| `--radius-12`   | 12px   | `rounded-12`   | Cards, dropdowns, overlays, content script panels |
| `--radius-15`   | 15px   | `rounded-15`   | —                                               |
| `--radius-18`   | 18px   | `rounded-18`   | Modals, large card sections                     |
| `--radius-24`   | 24px   | `rounded-24`   | —                                               |
| `--radius-32`   | 32px   | `rounded-32`   | —                                               |
| `--radius-full` | 9999px | `rounded-full` | Circles, avatars, pill badges                   |

---

## Spacing

Base grid: **4 px**.

| Token | Value  | Typical usage            |
|-------|--------|--------------------------|
| `1`   | 4px    | Internal icon gap        |
| `2`   | 8px    | Compact internal padding |
| `3`   | 12px   | Standard padding         |
| `4`   | 16px   | Generous padding         |
| `6`   | 24px   | Section gap              |

---

## Components

### Popup layout

- Fixed dimensions: **360 × 560 px**
- Structure: fixed header + tabs + scrollable area + fixed footer

```
┌──────────────────────────────┐  ← 360px
│ Header  [Pins] [👤●]         │  ← 48px, white bg, gray-100 bottom border
│                              │     Pins = pill toggle (blue-50 when active)
│                              │     👤 = user icon button (red badge for pending contacts)
├──────────────────────────────┤
│ Tabs: Inbox / My comments / Feed │  ← flex-shrink-0
├──────────────────────────────┤
│                              │
│ Scrollable area              │  ← flex-1, overflow-y-auto
│                              │
├──────────────────────────────┤
│ Footer (New comment + link)  │  ← flex-shrink-0, px-4 py-3, top border
└──────────────────────────────┘  ← 560px total
```

> The layout requires `html, body, #root { height: 100% }` for `h-full` to work.

---

### Extension — `Button` component

`popup/components/Button.tsx` — two axes: **variant** and **size**.

**Variants:**

| Variant         | Style                                                  | Usage                           |
|-----------------|--------------------------------------------------------|---------------------------------|
| `primary`       | `bg-blue-600 text-white hover:bg-blue-700`             | Primary CTA                     |
| `secondary`     | `border border-gray-200 text-gray-600 hover:bg-gray-50`| Secondary action                |
| `danger`        | `border border-red-200 text-red-500 hover:bg-red-50`   | Soft destructive (sign out)     |
| `danger-filled` | `bg-red-500 text-white hover:bg-red-600`               | Strong destructive (confirm delete) |
| `success`       | `border border-green-600 text-green-600 hover:bg-green-50` | Positive confirmation (resolve) |

**Sizes:**

| Size        | Classes                    | Usage                              |
|-------------|----------------------------|------------------------------------|
| `md` (default) | `w-full py-2 text-[13px]` | Full-width footer buttons          |
| `sm`        | `px-2.5 py-1 text-[11px]` | Inline actions (Accept/Decline)    |

```tsx
import { Button } from '../components/Button'

<Button variant="secondary" onClick={…} className="flex items-center gap-1.5">
  Open page <Icon icon={arrowRightIcon} width={14} height={14} />
</Button>

<Button size="sm" onClick={…}>Accept</Button>
<Button size="sm" variant="secondary" onClick={…}>Decline</Button>
```

---

### Extension — `IconButton` component

`popup/components/IconButton.tsx` — icon-only actions (back navigation, delete).

Base: `p-1 rounded-3 flex items-center justify-center transition-colors duration-150 disabled:opacity-50`

| Variant           | Style                                  | Usage             |
|-------------------|----------------------------------------|-------------------|
| `default` (default) | `text-gray-400 hover:text-gray-600`  | Back navigation   |
| `danger`          | `text-gray-400 hover:text-red-500`     | Delete icon       |

```tsx
import { IconButton } from '../components/IconButton'

<IconButton onClick={onBack}>
  <Icon icon={arrowLeftIcon} width={18} height={18} />
</IconButton>

<IconButton variant="danger" onClick={…} title="Delete">
  <Icon icon={trash2Icon} width={14} height={14} />
</IconButton>
```

---

### Webapp — `Button` component

`webapp/src/components/Button.tsx` — inline, not full-width by default.

Base: `inline-flex items-center gap-1.5 rounded-6 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed`

**Variants:**

| Variant         | Style                                                               | Usage                     |
|-----------------|---------------------------------------------------------------------|---------------------------|
| `outline` (default) | `border border-gray-200 text-gray-600 hover:bg-gray-50`         | Standard action           |
| `primary`       | `bg-blue-600 text-white hover:bg-blue-700`                          | Primary CTA               |
| `secondary`     | `bg-white text-black hover:bg-zinc-100`                             | Secondary on dark bg      |
| `success-outline` | `border border-green-600 text-green-700 hover:bg-green-50`        | Resolve / positive confirm|
| `danger`        | `bg-red-600 text-white hover:bg-red-700`                            | Strong destructive        |
| `danger-outline` | `border border-red-100 text-red-400 hover:bg-red-50`              | Soft destructive          |
| `ghost-danger`  | `border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200` | Subtle delete   |
| `ghost`         | `text-zinc-500 hover:text-white`                                    | Minimal action on dark    |

**Sizes:**

| Size  | Classes                          |
|-------|----------------------------------|
| `xs`  | `px-2 py-1 text-xs`              |
| `sm` (default) | `px-2.5 py-1.5 text-xs` |
| `md`  | `px-3 py-2 text-sm`              |
| `lg`  | `px-6 py-2.5 text-sm font-semibold` |

---

### Webapp — `IconButton` component

`webapp/src/components/IconButton.tsx` — same API as extension.

Base: `p-1 rounded-3 flex items-center justify-center transition-colors duration-150 disabled:opacity-50`

| Variant           | Style                              | Usage                          |
|-------------------|------------------------------------|--------------------------------|
| `default` (default) | `text-gray-400 hover:text-gray-600` | Clear inputs, dismiss          |
| `danger`          | `text-gray-400 hover:text-red-500`  | Unfollow, quick delete in lists|

---

### Webapp — `Input` component

`webapp/src/components/Input.tsx`

```
w-full px-3 py-2 text-sm rounded-6
border border-gray-200 bg-white text-gray-900
placeholder:text-gray-400
focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30
transition-colors
```

---

### Extension — Text field

```
w-full px-3 py-2 rounded-6 text-[13px]
border border-gray-200 bg-white text-gray-900
placeholder:text-gray-400
focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
```

---

### @username mention (in-page composer)

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

---

### Toggle switch (public mode)

```css
/* label */   display: flex; align-items: center; gap: 6px; cursor: pointer;
              font-size: 12px; color: #94a3b8;  /* active: #2563EB */
/* pill */    width: 30px; height: 17px; border-radius: 9px;
              background: #cbd5e1;  /* active: #2563EB */
/* thumb */   width: 13px; height: 13px; border-radius: 50%; background: #fff;
              transition: left 0.2s;  /* inactive: left 2px, active: left 15px */
```

---

### Inbox item (extension)

```
px-4 py-3  border-b border-gray-100
hover:bg-gray-50  cursor-pointer  transition-colors duration-100

• Unread indicator: blue-500 dot (8px) on the left
• Username:  text-[13px] font-semibold gray-900
• URL:       text-[11px] gray-500  truncate
• Excerpt:   text-[12px] gray-700  line-clamp-1
• Time:      text-[11px] gray-400  ml-auto
```

---

### Pin (page overlay)

Circle 28 px, `border-2 border-white`, `box-shadow 0 2px 8px rgba(0,0,0,0.28)`.

Content (by priority):
1. **Avatar** — `<img>` `object-fit: cover` if `from_avatar_url` is set
2. **Initials** — 2 letters in white, deterministic colored background

```
Initials palette: #2563EB #7C3AED #DB2777 #DC2626 #D97706 #059669 #0891B2 #4F46E5
```

---

### Content script panels (Shadow DOM)

All panels: `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)`, width 296px.

**Detail panel** action buttons (`border-radius: 6px`, `padding: 5px 10px`, 12px 500 weight):

| Button  | Background | Text       |
|---------|------------|------------|
| Dismiss | `#f1f5f9`  | `#475569`  |
| Profile | `#eff6ff`  | `#2563EB`  |
| Delete  | `#fff1f2`  | `#ef4444`  |

**Profile overlay** — same shadow/size. Back arrow + centered title + close. Avatar 40px centered, `@username` 14px/600.

Public comment item:
```css
.comment-item { border-radius: 6px; background: #f8fafc; border: 1px solid transparent; }
.comment-item:hover { background: #eff6ff; border-color: #bfdbfe; }
```

---

## Icons

### Extension popup — Iconify (offline, CSP-safe)

```bash
@iconify/react          # React <Icon /> component
@iconify-icons/lucide   # Lucide icon set
```

Standard size: **16 px**. Color inherited via `currentColor`.

| Icon                  | Import                                   | Used in                        |
|-----------------------|------------------------------------------|--------------------------------|
| `lucide:map-pin`      | `@iconify-icons/lucide/map-pin`          | Pins active (header)           |
| `lucide:map-pin-off`  | `@iconify-icons/lucide/map-pin-off`      | Pins hidden (header)           |
| `lucide:user`         | `@iconify-icons/lucide/user`             | Settings/user toggle (header)  |
| `lucide:external-link`| `@iconify-icons/lucide/external-link`    | Open web app (footer)          |
| `lucide:arrow-left`   | `@iconify-icons/lucide/arrow-left`       | Back (Inbox, Sent, Feed)       |
| `lucide:arrow-right`  | `@iconify-icons/lucide/arrow-right`      | Open page                      |
| `lucide:check`        | `@iconify-icons/lucide/check`            | Copy confirm, resolve          |
| `lucide:link-2`       | `@iconify-icons/lucide/link-2`           | Copy link                      |
| `lucide:trash-2`      | `@iconify-icons/lucide/trash-2`          | Delete comment                 |
| `lucide:image-off`    | `@iconify-icons/lucide/image-off`        | Missing screenshot             |
| `lucide:bookmark`     | `@iconify-icons/lucide/bookmark`         | Follow URL (Feed)              |
| `lucide:bookmark-check`| `@iconify-icons/lucide/bookmark-check` | URL followed (Feed)            |

### Extension content script — inline SVG

No React in the content script. Icons are SVG string constants injected via `innerHTML`. Always use `escapeHtml()` for user content.

| Constant     | Usage                              |
|--------------|------------------------------------|
| `SVG_X`      | Close composer / panels            |
| `SVG_SEND`   | Send button (composer)             |
| `SVG_CHECK`  | Toast confirmation / Dismiss icon  |
| `SVG_GLOBE`  | Public mode indicator              |
| `SVG_TRASH`  | Delete button (detail panel)       |
| `SVG_RESOLVE`| Resolve/Dismiss button icon        |
| `SVG_BACK`   | Back button (profile overlay)      |
| `SVG_USER`   | Profile button (detail panel)      |

### Webapp — Lucide React

```tsx
import { Check, Trash2, ExternalLink } from 'lucide-react'

<Check className="w-3.5 h-3.5" />
```

Standard sizes: `w-3.5 h-3.5` (14px) for inline actions, `w-4 h-4` (16px) for nav/headers.

---

## Behaviors

- **Transitions**: `duration-150` for interactive states (hover, focus), `duration-200` for panel enter/exit
- **No decorative animation** — only to indicate a state change
- **Loading**: `animate-spin` blue-600 spinner, centered (`<Spinner />` / `<Loading />`)
- **Empty states**: short centered message in `gray-400`, icon above (`<EmptyState />`)

---

## Tailwind — configuration

Both projects use **Tailwind v4** with `@import "tailwindcss"` and `@theme` for custom tokens. No `tailwind.config.ts`.

Shared tokens (defined in both `popup/index.css` and `webapp/src/index.css`):
- Border radius scale (`--radius-0` → `--radius-full`)

Webapp-only tokens (`webapp/src/index.css`):
- Dark color scale (`--color-dark-*`)
- Dark border scale (`--color-dark-border-*`)

Extension popup fixed size (`popup/index.css`):
```css
html, body, #root { height: 100%; margin: 0; }
body { width: 360px; height: 560px; overflow: hidden; }
```
