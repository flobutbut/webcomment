import { Link } from 'react-router-dom'

const LAST_UPDATED = 'June 26, 2026'
const CONTROLLER_EMAIL = 'privacy@voidmark.app'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="font-mono text-sm font-bold tracking-widest text-white uppercase">{title}</h2>
      <div className="space-y-3 text-zinc-400 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Nav */}
      <nav className="border-b border-[#111] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-mono text-sm font-bold tracking-widest text-white hover:text-zinc-300 transition-colors">
            VOIDMARK
          </Link>
          <span className="font-mono text-xs text-zinc-600">Privacy Policy</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div className="space-y-3 border-b border-[#111] pb-10">
          <h1 className="font-mono text-2xl font-bold tracking-widest uppercase">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This policy describes how VoidMark collects, uses, and protects your personal data in accordance
            with the General Data Protection Regulation (GDPR — Regulation (EU) 2016/679).
          </p>
        </div>

        {/* 1 */}
        <Section id="controller" title="01 — Data Controller">
          <p>
            The data controller is <strong className="text-zinc-200">Florian Butour</strong>, operating VoidMark
            as an individual. For any data protection enquiry, contact:{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">
              {CONTROLLER_EMAIL}
            </a>
          </p>
        </Section>

        {/* 2 */}
        <Section id="data-collected" title="02 — Data We Collect">
          <p>We collect only the data necessary to provide the service:</p>
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="text-left py-2 pr-4 text-zinc-500 font-normal">Data</th>
                <th className="text-left py-2 pr-4 text-zinc-500 font-normal">Purpose</th>
                <th className="text-left py-2 text-zinc-500 font-normal">Legal basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818]">
              {[
                ['Email address', 'Authentication, notifications', 'Contract — Art. 6(1)(b)'],
                ['Username, initials, avatar', 'Profile display', 'Contract — Art. 6(1)(b)'],
                ['Comment content, tags', 'Core feature delivery', 'Contract — Art. 6(1)(b)'],
                ['Page URL, pin coordinates', 'Anchoring comments to web pages', 'Contract — Art. 6(1)(b)'],
                ['Page screenshot (WebP)', 'Visual context for comments', 'Contract — Art. 6(1)(b)'],
                ['Follow relationships', 'Social features', 'Contract — Art. 6(1)(b)'],
                ['Page visit analytics', 'Service improvement (aggregated)', 'Legitimate interest — Art. 6(1)(f)'],
              ].map(([data, purpose, basis]) => (
                <tr key={data}>
                  <td className="py-2 pr-4 text-zinc-300">{data}</td>
                  <td className="py-2 pr-4 text-zinc-400">{purpose}</td>
                  <td className="py-2 text-zinc-500">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-zinc-600 mt-1">
            Analytics data (page views, browser type, country) is collected via Vercel Analytics
            in aggregated form. No individual tracking profile is built.
          </p>
        </Section>

        {/* 3 */}
        <Section id="extension" title="03 — Chrome Extension">
          <p>
            The VoidMark Chrome extension requests permission to run on all websites (<code className="text-zinc-300 bg-[#111] px-1 rounded text-xs">&lt;all_urls&gt;</code>).
            This permission is used exclusively to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Display comment pins on pages where comments exist</li>
            <li>Capture a screenshot of the visible viewport when you create a comment</li>
            <li>Store the position (coordinates) of your comment pin on the page</li>
          </ul>
          <p>
            The extension does not track your browsing history. It only activates when you
            explicitly create or view a comment.
          </p>
          <p>
            Your session token and profile are stored locally in{' '}
            <code className="text-zinc-300 bg-[#111] px-1 rounded text-xs">chrome.storage.local</code> and
            are cleared when you sign out.
          </p>
        </Section>

        {/* 4 */}
        <Section id="screenshots" title="04 — Screenshots">
          <p>
            Screenshots are captured only when you explicitly create a comment. They are stored in a
            private storage bucket (not publicly accessible) and can only be viewed by you and the
            recipients of your comment.
          </p>
          <p>
            Screenshots are stored indefinitely as long as the associated comment exists. Deleting
            a comment also deletes its screenshot. When you delete your account, your screenshots
            are moved to an anonymous storage folder, removing the link to your identity, and
            remain accessible only to comment recipients.
          </p>
        </Section>

        {/* 5 */}
        <Section id="retention" title="05 — Data Retention">
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="text-left py-2 pr-4 text-zinc-500 font-normal">Data</th>
                <th className="text-left py-2 text-zinc-500 font-normal">Retention period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818]">
              {[
                ['Account data (profile, comments)', 'Until account deletion'],
                ['Session tokens', 'Until sign-out or expiry'],
                ['Emails of non-registered recipients', '90 days after the last message'],
                ['Share links', '30 days by default (configurable)'],
                ['Analytics data', 'Per Vercel\'s retention policy (30 days)'],
                ['Transactional emails (via Resend)', 'Per Resend\'s log retention policy (30 days)'],
              ].map(([data, period]) => (
                <tr key={data}>
                  <td className="py-2 pr-4 text-zinc-300">{data}</td>
                  <td className="py-2 text-zinc-400">{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 6 */}
        <Section id="sub-processors" title="06 — Sub-processors">
          <p>We share data with the following sub-processors to operate the service:</p>
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="text-left py-2 pr-4 text-zinc-500 font-normal">Service</th>
                <th className="text-left py-2 pr-4 text-zinc-500 font-normal">Role</th>
                <th className="text-left py-2 text-zinc-500 font-normal">Data shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818]">
              {[
                ['Supabase', 'Database, auth, file storage', 'All user data'],
                ['Resend', 'Transactional email', 'Email address, comment content'],
                ['Vercel', 'Web hosting, analytics', 'Page views, browser metadata'],
              ].map(([service, role, data]) => (
                <tr key={service}>
                  <td className="py-2 pr-4 text-zinc-300">{service}</td>
                  <td className="py-2 pr-4 text-zinc-400">{role}</td>
                  <td className="py-2 text-zinc-500">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            All sub-processors operate under a Data Processing Agreement (DPA) and apply appropriate
            technical and organisational security measures.
          </p>
          <p>
            Data may be transferred to servers located in the United States. These transfers are
            governed by Standard Contractual Clauses (SCCs) as approved by the European Commission.
          </p>
        </Section>

        {/* 7 */}
        <Section id="your-rights" title="07 — Your Rights">
          <p>Under the GDPR, you have the following rights:</p>
          <ul className="space-y-2">
            {[
              ['Access (Art. 15)', 'Request a copy of all data we hold about you.'],
              ['Rectification (Art. 16)', 'Correct inaccurate data in your account settings.'],
              ['Erasure (Art. 17)', 'Delete your account and associated data from the Settings page.'],
              ['Portability (Art. 20)', 'Request an export of your data in machine-readable format.'],
              ['Objection (Art. 21)', 'Opt out of email notifications in your account settings at any time.'],
              ['Restriction (Art. 18)', 'Request that we restrict processing of your data.'],
            ].map(([right, desc]) => (
              <li key={right} className="flex gap-3">
                <span className="text-zinc-200 font-mono text-xs shrink-0 mt-0.5">{right}</span>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">
              {CONTROLLER_EMAIL}
            </a>. We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with your national data protection authority.
            For France: <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-zinc-300">CNIL — cnil.fr</a>.
          </p>
        </Section>

        {/* 8 */}
        <Section id="contact" title="08 — Contact">
          <p>
            For any question about this policy or your personal data:{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">
              {CONTROLLER_EMAIL}
            </a>
          </p>
        </Section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#111] mt-16">
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
