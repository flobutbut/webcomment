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
├── extension/          # Chrome Extension
│   ├── src/
│   │   ├── background/ # Service worker
│   │   ├── content/    # Scripts injected into pages
│   │   ├── popup/      # Main extension UI
│   │   └── shared/     # Common utilities
│   ├── public/
│   ├── manifest.json
│   └── package.json
├── supabase/           # Supabase local config
│   ├── migrations/     # SQL migrations
│   └── functions/      # Edge Functions
└── docs/               # Technical documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Chrome Extension](docs/EXTENSION.md)
- [API & Edge Functions](docs/API.md)
- [Roadmap](docs/ROADMAP.md)
