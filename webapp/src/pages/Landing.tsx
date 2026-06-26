import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { PageComments } from '../components/PageComments'

const GITHUB_URL = 'https://github.com/flobutbut/webcomment'

const USE_CASES = [
  {
    id: '01',
    tag: 'Feedback',
    title: 'Design feedback that lands.',
    body: "Drop a pin on the exact element. No screenshots, no 'the button in the top left' confusion. Just point and say it.",
  },
  {
    id: '02',
    tag: 'Review',
    title: 'Code review beyond the IDE.',
    body: 'Comment on GitHub, docs, Notion — not just files. Where the code lives in the browser, your review lives too.',
  },
  {
    id: '03',
    tag: 'Annotation',
    title: 'Comment on any web page.',
    body: "An article. A competitor's checkout. A form that frustrates your users. Anchor thoughts exactly where they belong.",
  },
  {
    id: '04',
    tag: 'Async',
    title: 'No meeting needed.',
    body: 'Share a link. They open it, see exactly what you saw, read your comment in context. Async but precise.',
  },
  {
    id: '05',
    tag: 'Notes',
    title: 'Personal notes, anchored.',
    body: 'Send a comment to yourself. Annotate docs you return to, bookmark insights from papers — your thoughts, pinned in place.',
  },
  {
    id: '06',
    tag: 'QA',
    title: 'Bug reports with context.',
    body: 'Mark exactly where the issue is on the live page. Screenshot captured automatically. No more "somewhere on the settings page."',
  },
]

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export default function Landing() {
  const [modal, setModal] = useState<'signin' | 'early-access' | null>(null)
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-[#080808] text-white cursor-crosshair">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#111] bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-sm font-bold tracking-widest text-white">
            WEBCOMMENT
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal('signin')}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setModal('early-access')}
              className="text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-1.5 rounded-6 transition-colors font-semibold"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero-grid min-h-screen flex flex-col items-center justify-center px-6 pt-14 relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[500px] rounded-full bg-blue-600/[0.04] blur-3xl" />
        </div>
        {/* top-edge line */}
        <div className="absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-600/20 to-transparent" />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-10 px-3 py-1.5 rounded-full border border-[#2a2a2a] bg-[#0c0c0c] font-mono text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            v0.1 — private beta
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            Leave marks<br />
            <span className="text-blue-500">on the web.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-lg mx-auto mb-3 leading-relaxed">
            Anchor private comments to any page.
            Screenshot captured. Shared like a dead drop.
          </p>

          <p className="font-mono text-xs text-zinc-500 mb-12">
            // no embed code. no widget. just the extension.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-9 font-semibold text-sm hover:bg-zinc-100 active:bg-zinc-200 transition-colors w-full sm:w-auto justify-center"
            >
              <GitHubIcon />
              Get the extension
            </a>
            <button
              onClick={() => setModal('early-access')}
              className="flex items-center gap-2 border border-[#222] text-zinc-400 hover:text-white hover:border-[#333] px-6 py-3 rounded-9 font-medium text-sm transition-all w-full sm:w-auto justify-center"
            >
              Create account →
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-24 font-mono text-xs text-zinc-500 text-center select-none">
          <span className="text-zinc-600">$ </span>click anywhere on the page<span className="blink ml-0.5 text-blue-500">▌</span>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-[#111]">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-zinc-500 mb-3">// how it works</p>
          <h2 className="text-3xl font-bold mb-20 text-white">Three steps. No setup.</h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                n: '01',
                title: 'Click on anything.',
                body: 'Activate the extension, then click on any element on the page. A crosshair cursor lets you pin exactly where you mean.',
              },
              {
                n: '02',
                title: 'Write your comment.',
                body: 'An anchored composer appears. Type your message, @mention someone. The screenshot is captured automatically in the background.',
              },
              {
                n: '03',
                title: 'They see exactly what you saw.',
                body: 'Your recipient gets a notification. They open the page — your pin is there, anchored to the same element. Context intact.',
              },
            ].map(item => (
              <div key={item.n} className="relative">
                <div className="font-mono text-6xl font-bold text-[#1e1e1e] mb-5 select-none leading-none">
                  {item.n}
                </div>
                <div className="w-8 h-px bg-blue-600/40 mb-5" />
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#050505] border-t border-[#0f0f0f]">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-zinc-500 mb-3">// use cases</p>
          <h2 className="text-3xl font-bold mb-4 text-white">
            Built for anyone who comments on work.
          </h2>
          <p className="text-zinc-400 mb-16 max-w-md text-sm leading-relaxed">
            If you've ever taken a screenshot just to point at something,
            there's a better way.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {USE_CASES.map(uc => (
              <div
                key={uc.id}
                className="border border-[#141414] bg-[#0a0a0a] hover:border-[#232323] hover:bg-[#0d0d0d] rounded-12 p-6 transition-all duration-200 group cursor-default"
              >
                <div className="flex items-start justify-between mb-5">
                  <span className="font-mono text-[10px] text-zinc-500">[{uc.id}]</span>
                  <span className="font-mono text-[10px] text-zinc-500 border border-[#2a2a2a] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {uc.tag}
                  </span>
                </div>
                <h3 className="text-zinc-200 font-semibold text-[15px] mb-2.5 group-hover:text-white transition-colors">
                  {uc.title}
                </h3>
                <p className="text-zinc-400 text-[13px] leading-relaxed">{uc.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-[#111]">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-[#090d14] border border-[#1a2540] rounded-18 p-12 md:p-16 text-center overflow-hidden">
            {/* grid overlay */}
            <div className="absolute inset-0 hero-grid opacity-40" />
            {/* top line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-blue-600/60 to-transparent" />
            {/* corner accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-l border-t border-blue-600/30" />
            <div className="absolute top-4 right-4 w-4 h-4 border-r border-t border-blue-600/30" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-l border-b border-blue-600/30" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-r border-b border-blue-600/30" />

            <div className="relative z-10">
              <p className="font-mono text-xs text-blue-500/60 mb-5 uppercase tracking-widest">
                // install the extension
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start leaving marks.
              </h2>
              <p className="text-zinc-500 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
                Load the extension from GitHub.
                Works on Chrome and any Chromium-based browser.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-7 py-3.5 rounded-9 font-semibold text-sm transition-colors"
                >
                  <GitHubIcon />
                  View on GitHub
                </a>
                <button
                  onClick={() => setModal('early-access')}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-3 font-mono"
                >
                  or create an account →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#0f0f0f] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-500">
            WEBCOMMENT
          </span>
          <div className="flex items-center gap-6">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              GitHub
            </a>
            <button
              onClick={() => setModal('signin')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setModal('early-access')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign up
            </button>
          </div>
          <span className="font-mono text-xs text-zinc-600 hidden sm:block">
            // leave no trace. leave a comment.
          </span>
        </div>
      </footer>

      <PageComments />

      {modal && (
        <AuthModal
          initialMode={modal}
          onClose={() => setModal(null)}
          onSuccess={() => navigate('/dashboard')}
        />
      )}
    </div>
  )
}
