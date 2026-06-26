import { Link } from 'react-router-dom'

const LAST_UPDATED  = 'June 26, 2026'
const CONTACT_EMAIL = 'legal@voidmark.app'
const APP_URL       = 'https://voidmark.app'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="font-mono text-sm font-bold tracking-widest text-white uppercase">{title}</h2>
      <div className="space-y-3 text-zinc-400 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</h3>
      <div className="space-y-2 text-zinc-400 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Nav */}
      <nav className="border-b border-[#111] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-mono text-sm font-bold tracking-widest text-white hover:text-zinc-300 transition-colors">
            VOIDMARK
          </Link>
          <span className="font-mono text-xs text-zinc-600">Legal</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        {/* Header */}
        <div className="space-y-3 border-b border-[#111] pb-10">
          <h1 className="font-mono text-2xl font-bold tracking-widest uppercase">Terms & Legal Notices</h1>
          <p className="text-zinc-500 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This page contains the Terms of Service governing your use of VoidMark, as well as the
            legal notices required under French law (Loi n°2004-575 du 21 juin 2004 — LCEN).
          </p>
          <nav className="flex flex-wrap gap-4 pt-2">
            {[
              ['#terms',   'Terms of Service'],
              ['#legal',   'Legal Notices'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* ── TERMS OF SERVICE ───────────────────────────────────── */}
        <div id="terms" className="space-y-10">
          <h2 className="font-mono text-lg font-bold tracking-widest text-white uppercase border-b border-[#111] pb-4">
            Terms of Service
          </h2>

          <Section id="terms-purpose" title="1 — Purpose">
            <p>
              VoidMark is a service that allows users to leave anchored comments, with screenshots,
              on any web page, and to share them privately with other users or groups.
            </p>
            <p>
              By creating an account or using the VoidMark Chrome extension or web application, you
              agree to these Terms of Service in full. If you do not agree, you must not use the service.
            </p>
          </Section>

          <Section id="terms-eligibility" title="2 — Eligibility">
            <p>
              You must be at least <strong className="text-zinc-200">16 years old</strong> to create
              an account, in accordance with GDPR Article 8 (age of digital consent in France).
            </p>
            <p>
              By registering, you confirm that the information you provide is accurate and that you
              have the legal capacity to enter into a binding agreement.
            </p>
          </Section>

          <Section id="terms-account" title="3 — Account & Access">
            <p>
              You are responsible for maintaining the confidentiality of your credentials and for all
              activity that occurs under your account. You must notify us immediately at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">{CONTACT_EMAIL}</a>{' '}
              if you suspect unauthorised access.
            </p>
            <p>
              One account per person. Creating multiple accounts to circumvent a suspension or any
              restriction is prohibited.
            </p>
          </Section>

          <Section id="terms-acceptable-use" title="4 — Acceptable Use">
            <SubSection title="You may use VoidMark to">
              <ul className="list-disc list-inside space-y-1">
                <li>Leave comments on publicly accessible web pages</li>
                <li>Share those comments privately with other users, groups, or email addresses</li>
                <li>Annotate pages for professional, creative, or personal purposes</li>
              </ul>
            </SubSection>

            <SubSection title="You may NOT use VoidMark to">
              <ul className="space-y-2">
                {[
                  ['Harassment & threats', 'Send comments intended to harass, intimidate, threaten, or harm any person, including via @mentions, groups, or repeated unsolicited contact.'],
                  ['Hate speech', 'Post content that incites discrimination, hatred, or violence based on origin, gender, sexual orientation, religion, disability, or any other characteristic.'],
                  ['Defamation', 'Publish false statements of fact that damage the reputation of a person or organisation.'],
                  ['Impersonation', 'Pretend to be another user, public figure, or organisation, or misrepresent your affiliation.'],
                  ['Illegal content', 'Share, link to, or facilitate access to content that is illegal under French or EU law, including CSAM, pirated material, or content promoting terrorism.'],
                  ['Spam & flooding', 'Send unsolicited bulk comments, repeatedly send comments to unwilling recipients, or abuse the email notification system.'],
                  ['Scraping & automation', 'Access the service through automated means, bots, or scripts without prior written authorisation.'],
                  ['Circumventing security', 'Attempt to bypass, disable, or interfere with any security feature, access control, or rate limit of the service.'],
                  ['Capturing private content', 'Use the screenshot feature to capture and share content you are not authorised to view or distribute (e.g. private dashboards, confidential documents, other people\'s accounts).'],
                  ['Doxing', 'Collect, publish, or share personally identifiable information about other users without their consent.'],
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-zinc-200 font-medium shrink-0 text-xs mt-0.5">{title} —</span>
                    <span className="text-zinc-400">{desc}</span>
                  </li>
                ))}
              </ul>
            </SubSection>
          </Section>

          <Section id="terms-content" title="5 — User Content">
            <p>
              You retain ownership of the content you create (comments, screenshots). By submitting
              content, you grant VoidMark a limited, non-exclusive licence to store and transmit it
              solely for the purpose of operating the service.
            </p>
            <p>
              You are solely responsible for the content you post and share. VoidMark does not
              pre-screen user content but reserves the right to remove any content and suspend or
              terminate any account that violates these Terms, without prior notice in serious cases.
            </p>
            <p>
              Comments sent to other users are not encrypted end-to-end. Do not share confidential
              or sensitive information through the service.
            </p>
          </Section>

          <Section id="terms-moderation" title="6 — Moderation & Enforcement">
            <p>
              VoidMark reserves the right, at its sole discretion, to:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Remove any content that violates these Terms or applicable law</li>
              <li>Suspend or permanently terminate any account, with or without notice</li>
              <li>Restrict access to specific features for accounts in breach of these Terms</li>
              <li>Report illegal content to the competent authorities</li>
            </ul>
            <p>
              Decisions are made on a case-by-case basis. If your account is suspended and you
              believe it is in error, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="terms-liability" title="7 — Limitation of Liability">
            <p>
              VoidMark is provided <strong className="text-zinc-200">"as is"</strong>, without
              warranty of any kind. We do not guarantee uninterrupted availability, error-free
              operation, or the permanent retention of your data.
            </p>
            <p>
              To the fullest extent permitted by applicable law, VoidMark shall not be liable for:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Content posted by users</li>
              <li>Loss of data resulting from service interruption or account deletion</li>
              <li>Indirect, incidental, or consequential damages arising from use of the service</li>
              <li>Actions taken by third parties against you as a result of content you posted</li>
            </ul>
            <p>
              You use VoidMark at your own risk. You are solely responsible for ensuring your use
              complies with all laws applicable to you.
            </p>
          </Section>

          <Section id="terms-ip" title="8 — Intellectual Property">
            <p>
              The VoidMark name, logo, and the software powering the service are the exclusive
              property of Florian Butour. No licence to use them is granted beyond what is strictly
              necessary to use the service as intended.
            </p>
            <p>
              Third-party content visible through the service (web pages captured in screenshots)
              remains the property of its respective owners. VoidMark does not claim any rights over it.
            </p>
          </Section>

          <Section id="terms-changes" title="9 — Changes to These Terms">
            <p>
              We may update these Terms at any time. We will notify registered users by email at
              least 15 days before material changes take effect. Continued use of the service after
              that date constitutes acceptance of the updated Terms.
            </p>
            <p>
              If you do not agree with the changes, you may delete your account before the effective date.
            </p>
          </Section>

          <Section id="terms-law" title="10 — Governing Law & Jurisdiction">
            <p>
              These Terms are governed by <strong className="text-zinc-200">French law</strong>.
              Any dispute arising from or related to the use of VoidMark that cannot be resolved
              amicably shall be submitted to the competent courts of France.
            </p>
            <p>
              For consumer disputes, EU residents may also use the European Online Dispute Resolution
              platform:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-zinc-300">
                ec.europa.eu/consumers/odr
              </a>.
            </p>
          </Section>
        </div>

        {/* ── LEGAL NOTICES ──────────────────────────────────────── */}
        <div id="legal" className="space-y-10 border-t border-[#111] pt-16">
          <h2 className="font-mono text-lg font-bold tracking-widest text-white uppercase border-b border-[#111] pb-4">
            Legal Notices
          </h2>
          <p className="text-zinc-500 text-sm">
            Conformément à la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
          </p>

          <Section id="legal-publisher" title="Publisher">
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-[#181818]">
                {[
                  ['Full name',    'Florian Butour'],
                  ['Capacity',     'Individual — personal website publisher'],
                  ['Email',        CONTACT_EMAIL],
                  ['Website',      APP_URL],
                  ['SIRET',        'N/A — non-commercial individual project'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-2 pr-6 text-zinc-500 w-40">{label}</td>
                    <td className="py-2 text-zinc-300">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="legal-host" title="Hosting Provider">
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-[#181818]">
                {[
                  ['Company',  'Vercel Inc.'],
                  ['Address',  '340 S Lemon Ave #4133, Walnut, CA 91789, United States'],
                  ['Website',  'https://vercel.com'],
                  ['Contact',  'https://vercel.com/legal/privacy-policy'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-2 pr-6 text-zinc-500 w-40">{label}</td>
                    <td className="py-2 text-zinc-300">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="legal-contact" title="Contact">
            <p>
              For any legal enquiry:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4 hover:text-zinc-300">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              For data protection matters, see our{' '}
              <Link to="/privacy" className="text-white underline underline-offset-4 hover:text-zinc-300">
                Privacy Policy
              </Link>.
            </p>
          </Section>
        </div>

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
