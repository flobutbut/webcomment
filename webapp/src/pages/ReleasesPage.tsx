import { Link } from 'react-router-dom'

type ReleaseNote = { area: string; text: string }
type Release = {
  version: string
  date: string
  tag: string
  tagColor: 'blue' | 'green' | 'purple' | 'amber' | 'zinc'
  headline: string
  notes: ReleaseNote[]
}

const TAG_COLORS: Record<Release['tagColor'], string> = {
  blue:   'text-blue-400 border-blue-900 bg-blue-950/40',
  green:  'text-green-400 border-green-900 bg-green-950/40',
  purple: 'text-purple-400 border-purple-900 bg-purple-950/40',
  amber:  'text-amber-400 border-amber-900 bg-amber-950/40',
  zinc:   'text-zinc-400 border-zinc-700 bg-zinc-900/40',
}

const RELEASES: Release[] = [
  {
    version: '1.3.1',
    date: 'June 27, 2026',
    tag: 'Tech',
    tagColor: 'zinc',
    headline: 'Code quality audit & security hardening',
    notes: [
      { area: 'Webapp', text: 'Admin email removed from source code — now configured via environment variable, never bundled in the client.' },
      { area: 'Webapp', text: 'Supabase queries in Search now have a 200-item limit, preventing unbounded memory usage for large accounts.' },
      { area: 'Webapp', text: 'Screenshot thumbnail component unified across pages — previously three near-identical copies existed.' },
      { area: 'Webapp', text: 'Contact comments loading extracted into a dedicated hook; TypeScript compilation errors on import.meta.env resolved via tsconfig fix.' },
    ],
  },
  {
    version: '1.3.0',
    date: 'June 26, 2026',
    tag: 'Privacy',
    tagColor: 'blue',
    headline: 'GDPR compliance, data export & legal pages',
    notes: [
      { area: 'Extension & Webapp', text: 'Email addresses no longer exposed when searching users for groups or @mentions — search works by username only.' },
      { area: 'Webapp', text: 'Download your data — export a full JSON archive of your profile, comments, contacts, and groups from Settings → Data & Privacy.' },
      { area: 'Webapp', text: 'Privacy Policy and Terms of Service pages added. Legal notices in English and French (LCEN).' },
      { area: 'Webapp', text: 'Favicons now sourced from DuckDuckGo instead of Google — no domain leak when browsing followed URLs.' },
      { area: 'Backend', text: 'Share links now expire after 30 days by default.' },
      { area: 'Backend', text: 'Email addresses of non-registered recipients are automatically purged after 90 days.' },
      { area: 'Backend', text: 'Account deletion moves screenshots to a neutral path before erasure, preserving files for recipients while removing your identity from storage.' },
      { area: 'Email', text: 'Legal footer added to all notification emails with unsubscribe instructions.' },
    ],
  },
  {
    version: '1.2.0',
    date: 'June 26, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Email notifications, unread badge & UI polish',
    notes: [
      { area: 'Webapp', text: 'Settings → Notifications: toggle email alerts for new comments and contact requests independently.' },
      { area: 'Extension & Webapp', text: 'Unread badge on the Inbox nav item — live count of unread messages, disappears when you visit the inbox.' },
      { area: 'Extension', text: 'Comments icon in the header navigates directly to your inbox from anywhere in the extension.' },
      { area: 'Extension', text: 'Icon buttons on comment detail: Open page and Copy link are now compact icon buttons in the header, keeping the action area focused.' },
      { area: 'Extension', text: 'Tooltips on all icon buttons — hover to see what each one does.' },
      { area: 'Extension', text: '"Account settings" shortcut in the profile view opens the webapp settings page directly.' },
      { area: 'Webapp', text: 'Sidebar reordered: Inbox → Feed → Groups → My Comments → Contacts.' },
    ],
  },
  {
    version: '1.1.0',
    date: 'June 26, 2026',
    tag: 'Rebrand',
    tagColor: 'purple',
    headline: 'WebComment becomes VoidMark',
    notes: [
      { area: 'Extension & Webapp', text: 'Renamed to VoidMark across the extension, webapp, and all email notifications.' },
      { area: 'Extension', text: 'Share links now point to voidmark.app — previously opened localhost in production.' },
      { area: 'Backend', text: 'All email notifications migrated to @voidmark.app sender addresses.' },
    ],
  },
  {
    version: '1.0.0',
    date: 'June 26, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Groups & early access invites',
    notes: [
      { area: 'Extension & Webapp', text: 'Groups — create a private group, invite members, and share comments with the whole group at once. A shared feed shows all group activity.' },
      { area: 'Extension', text: '@GroupName in a comment body reaches all group members\' inboxes in one shot.' },
      { area: 'Webapp', text: 'Early access invite flow — request access, receive an email invite, set your username and password via a secure welcome page.' },
      { area: 'Webapp', text: 'Groups page: two-column layout with group list and detail view (Feed / People tabs).' },
    ],
  },
  {
    version: '0.9.0',
    date: 'June 26, 2026',
    tag: 'Design',
    tagColor: 'amber',
    headline: 'Dark mode & design system',
    notes: [
      { area: 'Webapp', text: 'Full dark mode on the dashboard — Light, Dark, and System (follows OS) modes. Zero flash on load, preference persisted.' },
      { area: 'Webapp', text: 'Theme toggle in the dashboard header; full Appearance section in Settings.' },
      { area: 'Extension & Webapp', text: 'IconButton component — consistent icon-only buttons across the whole UI.' },
      { area: 'Extension', text: 'Button system: new size prop (sm/md), success and secondary variants.' },
      { area: 'Extension & Webapp', text: 'Border radius token scale (3 px grid) standardised across extension and webapp.' },
    ],
  },
  {
    version: '0.8.0',
    date: 'June 25, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Feed — follow URLs',
    notes: [
      { area: 'Extension', text: 'New Feed tab: follow any URL and see its public comments in a dedicated feed alongside Inbox and My Comments.' },
      { area: 'Extension', text: 'Follow/Unfollow toggle in the feed tab top bar, scoped to the current page.' },
      { area: 'Webapp', text: 'Feed page in the dashboard: left column lists followed URLs with favicons; right column shows public comments for the selected URL.' },
      { area: 'Extension & Webapp', text: 'Inbox filter tabs: All / Mentions / Followed — quickly surface only what matters.' },
    ],
  },
  {
    version: '0.7.0',
    date: 'June 25, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Follow users & stable @mentions',
    notes: [
      { area: 'Extension & Webapp', text: 'Follow system — follow any user to receive their public comments in your inbox automatically.' },
      { area: 'Backend', text: '@mentions are now stored as UUIDs and resolved at display time, so they survive username renames correctly.' },
      { area: 'Extension', text: '"Open web app" link in the popup footer — opens the dashboard already authenticated via session handoff.' },
      { area: 'Webapp', text: 'Settings redesigned: inline editable avatar, editable username with uniqueness check, email change flow with confirmation.' },
    ],
  },
  {
    version: '0.6.0',
    date: 'June 25, 2026',
    tag: 'Design',
    tagColor: 'amber',
    headline: 'Shared design system, profiles & account deletion',
    notes: [
      { area: 'Webapp', text: 'Shared Button and Input components standardise all forms across the dashboard.' },
      { area: 'Webapp', text: 'Profile baseline — add a short bio visible on contact cards and search results.' },
      { area: 'Webapp', text: 'Delete account — type your username to confirm; sent comments are preserved as "Deleted user."' },
    ],
  },
  {
    version: '0.5.0',
    date: 'June 24, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: '@mention routing to inboxes',
    notes: [
      { area: 'Backend', text: '@mentioning a user in a comment now routes it directly to their inbox — no need to explicitly add them as a recipient.' },
      { area: 'Webapp', text: "Extension detection banner — the dashboard shows a prompt to install the extension if it isn't detected." },
    ],
  },
  {
    version: '0.4.0',
    date: 'June 24, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Web dashboard',
    notes: [
      { area: 'Webapp', text: 'Full dashboard at /dashboard — Inbox, My Comments, Contacts, and Settings accessible from any browser without the extension.' },
      { area: 'Webapp', text: 'Search bar with filter by type: received / sent / public.' },
      { area: 'Webapp', text: 'Sidebar navigation with user menu (avatar, username, sign out).' },
    ],
  },
  {
    version: '0.3.0',
    date: 'June 23, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'In-page profile overlay',
    notes: [
      { area: 'Extension', text: 'Click any pin to see the author\'s profile: avatar, public comments, and a contact request button — all inline on the page.' },
      { area: 'Extension', text: 'Clicking a public comment in the profile overlay navigates to that page and auto-opens the pin.' },
      { area: 'Extension', text: 'Service worker race condition on cold start fixed.' },
    ],
  },
  {
    version: '0.2.0',
    date: 'June 23, 2026',
    tag: 'Feature',
    tagColor: 'green',
    headline: 'Contacts, tags & avatars',
    notes: [
      { area: 'Extension', text: 'Contacts tab in Settings: accepted contacts, pending requests, search by username or email.' },
      { area: 'Extension', text: '#hashtags in comment bodies highlighted in blue.' },
      { area: 'Extension', text: 'Avatar system: profile photo with colored-initials fallback on pins and everywhere else.' },
      { area: 'Extension', text: 'Keyboard shortcuts: Shift+Enter to send, Esc to close, Alt+Shift+N to activate the pin picker globally.' },
    ],
  },
  {
    version: '0.1.0',
    date: 'June 22, 2026',
    tag: 'Launch',
    tagColor: 'zinc',
    headline: 'Initial release — end-to-end MVP',
    notes: [
      { area: 'Extension', text: 'Pin picker: click any element on any page to anchor a comment.' },
      { area: 'Extension', text: 'Screenshot captured automatically in the background (WebP, compressed).' },
      { area: 'Extension', text: 'Composer in Shadow DOM: @mention dropdown, public mode toggle, Shift+Enter to send.' },
      { area: 'Extension', text: 'Inbox with unread badge, mark as read, resolve, delete. My Comments with deletion.' },
      { area: 'Extension', text: 'Pins displayed on the live page, anchored to the original element, survive scroll and resize.' },
      { area: 'Extension', text: 'Share link system: generate a token; recipient opens the page with the pin already highlighted.' },
      { area: 'Extension', text: 'Realtime badge and browser notifications on new comments.' },
      { area: 'Backend', text: 'Supabase: profiles, comments, comment_recipients, share_links, screenshots bucket, Edge Functions.' },
      { area: 'Webapp', text: 'Landing page with live interactive demo, Supabase auth modal.' },
    ],
  },
]

export default function ReleasesPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Nav */}
      <nav className="border-b border-[#111] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-mono text-sm font-bold tracking-widest text-white hover:text-zinc-300 transition-colors">
            VOIDMARK
          </Link>
          <span className="font-mono text-xs text-zinc-600">Releases</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="space-y-3 border-b border-[#111] pb-12 mb-16">
          <p className="font-mono text-xs text-zinc-600">// changelog</p>
          <h1 className="font-mono text-2xl font-bold tracking-widest uppercase">Releases</h1>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
            Every version of VoidMark, most recent first.
            Builds are available on{' '}
            <a
              href="https://github.com/flobutbut/webcomment/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 underline underline-offset-4 hover:text-white transition-colors"
            >
              GitHub Releases
            </a>.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#181818]" />

          <div className="space-y-14">
            {RELEASES.map((r) => (
              <div key={r.version} className="relative pl-8">
                {/* dot */}
                <div className="absolute left-0 top-[6px] w-3.5 h-3.5 rounded-full border border-[#333] bg-[#111] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>

                {/* release block */}
                <div className="space-y-4">
                  {/* version + date + tag */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">v{r.version}</span>
                    <span className={`font-mono text-[10px] border px-2 py-0.5 rounded-full uppercase tracking-widest ${TAG_COLORS[r.tagColor]}`}>
                      {r.tag}
                    </span>
                    <span className="font-mono text-xs text-zinc-600">{r.date}</span>
                  </div>

                  {/* headline */}
                  <h2 className="text-zinc-200 font-semibold text-base leading-snug">{r.headline}</h2>

                  {/* notes */}
                  <ul className="space-y-2">
                    {r.notes.map((n, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 font-mono text-[10px] text-zinc-600 border border-[#222] px-1.5 py-0.5 rounded mt-0.5 h-fit whitespace-nowrap">
                          {n.area}
                        </span>
                        <span className="text-zinc-400 leading-relaxed">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#111] mt-24">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between">
          <Link to="/" className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to VoidMark
          </Link>
          <span className="font-mono text-xs text-zinc-700">© {new Date().getFullYear()} VoidMark</span>
        </div>
      </footer>

    </div>
  )
}
