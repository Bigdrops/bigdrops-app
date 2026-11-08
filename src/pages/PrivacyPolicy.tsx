import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePageMetadata } from '@/lib/seo'

const PAGE_METADATA = {
  title: 'Privacy Policy',
  description:
    'How BOUXRE collects, uses, stores, and protects your business data. NDPR-compliant privacy notice for Nigerian SMEs.',
} as const

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-foreground">
        <span className="font-mono text-xs font-medium text-muted-foreground">{number}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  usePageMetadata(PAGE_METADATA)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to BOUXRE
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            BOUXRE
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 2026</p>

        <Section number="01" title="Introduction">
          <p>
            BOUXRE is a B2B business management suite that helps Nigerian SMEs manage invoices, quotations,
            waybills, customers, suppliers, and related business operations. This Privacy Policy explains how we
            collect, use, and protect your data when you use our platform.
          </p>
        </Section>

        <Section number="02" title="Data We Collect">
          <p>
            <strong className="text-foreground">Account Information</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Email address, name, company name, phone number</li>
            <li>Login credentials (hashed and stored securely)</li>
          </ul>
          <p>
            <strong className="text-foreground">Business Data</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Invoices, quotations, waybills, purchase orders, and other business documents you create</li>
            <li>Customer and supplier records</li>
            <li>Product/service catalogs</li>
            <li>Financial transaction data (amounts, VAT, totals, payment status)</li>
          </ul>
          <p>
            <strong className="text-foreground">Usage Data</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Feature usage patterns</li>
            <li>Login times and session duration</li>
            <li>Device and browser information</li>
            <li>Error logs and performance data</li>
          </ul>
        </Section>

        <Section number="03" title="How We Use Your Data">
          <ul className="list-disc space-y-1 pl-5">
            <li>To operate and maintain the platform</li>
            <li>To generate, store, and retrieve business documents</li>
            <li>To sync data across your devices (web and mobile)</li>
            <li>To provide customer support</li>
            <li>To improve product features and user experience</li>
            <li>To send important service notifications (security alerts, account updates)</li>
          </ul>
        </Section>

        <Section number="04" title="Data Storage and Security">
          <ul className="list-disc space-y-1 pl-5">
            <li>Hosted on Supabase (PostgreSQL) with encryption in transit (HTTPS/TLS)</li>
            <li>Access controlled via Row Level Security (RLS) — each organization can only access its own data</li>
            <li>Authentication managed via secure session tokens</li>
            <li>Regular backups to prevent data loss</li>
            <li>We do not store payment card details; payments are processed by third-party providers</li>
          </ul>
        </Section>

        <Section number="05" title="Third-Party Services">
          <p>We use the following service providers who may process your data on our behalf:</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">Service</th>
                  <th className="px-4 py-2 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2 text-foreground">Supabase</td>
                  <td className="px-4 py-2">Database hosting and authentication</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Vercel</td>
                  <td className="px-4 py-2">Web application hosting</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Capacitor</td>
                  <td className="px-4 py-2">Mobile app framework</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We do not sell, rent, or share your data with third parties for marketing purposes.</p>
        </Section>

        <Section number="06" title="Data Retention">
          <ul className="list-disc space-y-1 pl-5">
            <li>Your data is retained for as long as your account remains active</li>
            <li>You may delete specific documents or your entire account at any time</li>
            <li>Upon account deletion, all associated data is permanently removed within 30 days</li>
            <li>Backup copies are purged within 90 days</li>
          </ul>
        </Section>

        <Section number="07" title="Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access and review all data we store about your organization</li>
            <li>Edit or correct inaccurate information</li>
            <li>Export your data in standard formats</li>
            <li>Delete your account and all associated data</li>
            <li>Request information about how your data is processed</li>
          </ul>
          <p>To exercise these rights, contact us using the information below.</p>
        </Section>

        <Section number="08" title="Regulatory Compliance">
          <p>
            BOUXRE, as data controller, is designed to comply with the{' '}
            <strong className="text-foreground">Nigeria Data Protection Regulation (NDPR)</strong>. We process personal
            data lawfully, fairly, and with transparency. Data is collected for specified, legitimate purposes and is
            not retained longer than necessary.
          </p>
        </Section>

        <Section number="09" title="Children's Privacy">
          <p>
            Our service is designed for business use and is not directed at children under 16. We do not knowingly
            collect personal information from children.
          </p>
        </Section>

        <Section number="10" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or an
            in-app notification. Continued use of the platform after changes are posted constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        <Section number="11" title="Contact Us">
          <p>For privacy-related inquiries, data access requests, or concerns:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Email:</strong>{' '}
              <a href="mailto:privacy@bouxre.com" className="text-foreground underline underline-offset-4 hover:opacity-80">
                privacy@bouxre.com
              </a>
            </li>
            <li>
              <strong className="text-foreground">Company:</strong> BOUXRE
            </li>
            <li>
              <strong className="text-foreground">Response time:</strong> We aim to respond within 5 business days
            </li>
          </ul>
        </Section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>BOUXRE. See also our cookie consent notice shown on first visit.</p>
        </footer>
      </article>
    </main>
  )
}
