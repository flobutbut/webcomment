# WebComment

A private, directional comment layer on any web page.

## Concept

WebComment is a Chrome extension that lets a user leave an anchored comment on any web page, addressed to a specific person or group. The recipient sees the comment as an overlay on the page, along with a screenshot of the context at the time of sending.

### Why a screenshot?

- The page may be behind authentication the recipient doesn't have
- The page may have changed since the comment was sent
- The page may no longer exist

The screenshot is the primary content. The live page is a bonus.

## User flow

**Sending side**
1. The user visits a page
2. They open the extension and click the area they want to comment on
3. They write their message and select the recipient(s) (email or group)
4. The extension captures the visible page, saves the pin, and sends

**Receiving side**
1. The recipient gets a notification in the extension
2. They see the screenshot with the pin and message
3. They can click "Open page" to view the live page with the comment as an overlay
4. If the page is inaccessible (auth, 404, etc.), the extension replaces the error screen with a service message showing the screenshot

## Installation (developer mode)

The extension is not yet published on any store. Download the latest build from [Releases](https://github.com/flobutbut/webcomment/releases/latest) or build from source.

### Chrome / Edge

1. Download `webcomment-vX.X.X.zip` from [Releases](https://github.com/flobutbut/webcomment/releases/latest) and unzip it
2. Go to `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked**
5. Select the unzipped `dist/` folder

### Firefox

1. Download `webcomment-vX.X.X.zip` from [Releases](https://github.com/flobutbut/webcomment/releases/latest) and unzip it
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…**
4. Navigate to the unzipped `dist/` folder and select `manifest.json`

> Firefox loads the extension as a temporary add-on — it is removed when the browser is closed. Re-load it from `about:debugging` after each restart.

### Build from source

```bash
cd extension
npm install
npm run build   # outputs to extension/dist/
```

Then follow the steps above using the generated `dist/` folder directly.

---

## Stack

| Layer | Technology |
|---|---|
| Extension | Chrome MV3, React 18, Vite, CRXJS |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
| File storage | Supabase Storage (WebP screenshots) |
| Email notifications | Supabase Edge Functions + Resend |

## Project structure

```
WebComment/
├── extension/          # Chrome / Firefox Extension (MV3)
│   ├── src/
│   │   ├── background/ # Service worker
│   │   ├── content/    # Scripts injected into pages
│   │   ├── popup/      # Main extension UI (React)
│   │   └── shared/     # Common utilities & types
│   ├── manifest.json
│   └── package.json
├── webapp/             # Landing page (Vite + React, deployed on Vercel)
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   └── package.json
├── supabase/           # Supabase config
│   ├── migrations/     # SQL migrations
│   └── functions/      # Edge Functions (Deno)
└── docs/               # Technical documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Extension](docs/EXTENSION.md)
- [API & Edge Functions](docs/API.md)
- [Design system](docs/DESIGN.md)
- [Roadmap](docs/ROADMAP.md)
