import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_EMAILS } from '../lib/admin'

const UPDATED = 'November 26, 2026'
const contact = ADMIN_EMAILS[0]

interface Section {
  title: string
  body: ReactNode
}

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Legal</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-slate-400">Last updated: {UPDATED}</p>
      <p className="mt-6 text-sm leading-relaxed text-slate-600">{intro}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">{section.body}</div>
          </section>
        ))}
      </div>

      <div className="card mt-12 p-6 text-sm leading-relaxed text-slate-600">
        <p className="font-bold text-slate-800">Questions about this page?</p>
        <p className="mt-2">
          Write to the administrator at{' '}
          {contact ? (
            <a className="font-semibold text-brand-600 hover:underline" href={`mailto:${contact}`}>
              {contact}
            </a>
          ) : (
            'the address shown in the admin console'
          )}
          .
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          <Link to="/terms" className="text-brand-600 hover:underline">Terms of use</Link>
          <Link to="/privacy" className="text-brand-600 hover:underline">Privacy</Link>
          <Link to="/" className="text-slate-500 hover:text-ink-950">Back to GiveFlow</Link>
        </div>
      </div>
    </div>
  )
}

export function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      intro="GiveFlow is a simple page where a person explains what they need support for, and supporters send an anonymous support request. These terms explain what the service does, what it does not do, and what is expected from recipients and supporters."
      sections={[
        {
          title: '1. What GiveFlow is',
          body: (
            <>
              <p>
                GiveFlow hosts public pages and records support requests. It is not a bank, a payment
                processor, a money transmitter, a charity or an escrow service.
              </p>
              <p>
                No payment is taken on this site and no card is ever charged. Supporters only send a
                request: an amount and a recipient. Transfers are made outside GiveFlow, manually, by
                the administrator.
              </p>
            </>
          ),
        },
        {
          title: '2. A request is not a payment',
          body: (
            <>
              <p>
                Each request appears in the recipient's dashboard as <strong>Requested</strong>. An
                administrator then reviews it and may approve it (<strong>Reviewed</strong>) or reject
                it. Approved requests are paid out manually by bank transfer and marked{' '}
                <strong>Paid out</strong>.
              </p>
              <p>
                Review is discretionary: a request can be rejected, for example when it looks
                fraudulent, duplicated or abusive. Nothing on this site is a promise that a request
                will be approved or that money will be sent.
              </p>
            </>
          ),
        },
        {
          title: '3. Your page, as a recipient',
          body: (
            <>
              <p>
                You sign in with a link sent to your e-mail address — there is no password. You are
                responsible for the accuracy of what you publish: display name, headline, story and
                payout contact address. Only describe genuine needs and use your own identity.
              </p>
              <p>
                You are also responsible for keeping access to your e-mail secure, because anyone who
                can open that inbox can sign in as you.
              </p>
            </>
          ),
        },
        {
          title: '4. Bank details',
          body: (
            <>
              <p>
                To receive a manual transfer you provide your account holder name, bank name, routing
                number (ABA), account number, account type and an optional note. Use an account you
                control. These details are stored in the database and visible only to you and the two
                administrator accounts — never on your public page.
              </p>
              <p>
                GiveFlow never asks for a password, a PIN, a one-time code or online-banking
                credentials. Do not enter such information in any field.
              </p>
            </>
          ),
        },
        {
          title: '5. If you send a support request',
          body: (
            <>
              <p>
                Requests are anonymous and cost nothing: no name, e-mail, message or payment detail is
                collected, and no refund is possible because nothing is charged.
              </p>
              <p>
                Do not send requests you do not intend to honour, and do not use the form to spam or
                harass a recipient. Requests that do are removed.
              </p>
            </>
          ),
        },
        {
          title: '6. Prohibited uses',
          body: (
            <p>
              You may not use GiveFlow to impersonate someone, to collect money for an illegal
              purpose, to launder money, to claim charitable or tax-deductible status, or to obtain
              another person's bank details. Pages and requests that break these rules are removed
              without notice.
            </p>
          ),
        },
        {
          title: '7. Taxes and charitable status',
          body: (
            <p>
              Support sent to an individual is generally <strong>not</strong> tax-deductible in the
              United States, and GiveFlow is not a registered charity. Recipients are responsible for
              declaring what they receive according to the rules that apply to them.
            </p>
          ),
        },
        {
          title: '8. Availability and suspension',
          body: (
            <p>
              The service is provided as is, on a best-effort basis, with no uptime guarantee. Pages,
              requests or access can be suspended or removed to protect recipients, supporters or the
              service itself. You may stop using GiveFlow at any time.
            </p>
          ),
        },
        {
          title: '9. Liability',
          body: (
            <p>
              To the extent permitted by law, GiveFlow and its administrator are not liable for
              indirect or consequential loss, for a request that is rejected, or for a transfer
              delayed or misdirected because of information supplied by a recipient. Nothing here
              limits rights that cannot be limited by law.
            </p>
          ),
        },
        {
          title: '10. Changes',
          body: (
            <p>
              These terms may be updated as the service changes; the date at the top shows the latest
              version. Continuing to use GiveFlow after an update means you accept it. How personal
              data is handled is described in the <Link to="/privacy" className="font-semibold text-brand-600 hover:underline">privacy page</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="GiveFlow is built to collect as little as possible: supporters stay anonymous, public pages never show bank details, and there is no password to store. This page describes exactly what is kept and who can see it."
      sections={[
        {
          title: '1. The short version',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Supporters send no personal data — only an amount, a recipient and a date.</li>
              <li>Recipients have an e-mail address (for sign-in) and the content of their page.</li>
              <li>Bank details are stored privately and appear only for their owner and the two administrators.</li>
              <li>No password is ever requested or stored; no advertising, analytics or tracking cookies are used.</li>
            </ul>
          ),
        },
        {
          title: '2. What a recipient provides',
          body: (
            <>
              <p>
                <strong>Sign-in:</strong> your e-mail address, used to send a single-use sign-in link.
              </p>
              <p>
                <strong>Public page:</strong> display name, handle, headline, story and avatar colour.
              </p>
              <p>
                <strong>Payout contact:</strong> an optional contact e-mail used by the administrator
                when a payout needs a follow-up.
              </p>
              <p>
                <strong>Bank details, only if you submit them:</strong> account holder, bank name,
                routing number, account number, account type and an optional note.
              </p>
            </>
          ),
        },
        {
          title: '3. What a supporter provides',
          body: (
            <p>
              No name, no e-mail, no message and no payment information. A support request stores only
              the recipient, the amount, the status and the date. Like any website, the hosting and
              database providers process technical connection data (such as IP address and timestamps)
              to deliver the service and keep it secure.
            </p>
          ),
        },
        {
          title: '4. What is public',
          body: (
            <p>
              The public page at <code className="rounded bg-slate-100 px-1.5 py-0.5">#/u/&lt;handle&gt;</code>{' '}
              reads from a restricted database view and exposes only the display name, handle,
              headline, story, avatar colour and join date. Payout contact address, sign-in e-mail and
              bank details are never part of it, and are not readable by other visitors.
            </p>
          ),
        },
        {
          title: '5. Bank details and who can see them',
          body: (
            <>
              <p>
                Bank details are stored in the database protected by row-level security: they are
                readable only by the recipient's own signed-in account and by the two administrator
                accounts listed in the admin configuration. They are used only to send the manual
                transfer and to answer a question about it.
              </p>
              <p>
                They are never displayed on a public page, never sold and never shared with a third
                party for marketing. They may be exported by an administrator to make transfers, so
                exported files must be kept secure. GiveFlow never asks for a password, PIN or
                online-banking login.
              </p>
            </>
          ),
        },
        {
          title: '6. Sign-in without a password',
          body: (
            <p>
              Sign-in uses a short-lived link sent to your e-mail; no password hash is stored. Your
              browser keeps the session token so you stay signed in, and the last support confirmation
              is kept for the current tab only. Anyone with access to your inbox can sign in as you,
              so protect that mailbox.
            </p>
          ),
        },
        {
          title: '7. Where data is stored',
          body: (
            <p>
              The site itself is static and hosted on GitHub Pages; it stores nothing on a server of
              its own. Accounts, pages, requests and bank details live in a Supabase project
              (authentication and PostgreSQL database), which acts as the data processor for this
              service.
            </p>
          ),
        },
        {
          title: '8. Retention and deletion',
          body: (
            <p>
              Support requests and the administrator's audit trail are kept to track each payout. You
              can edit or clear your page content from the dashboard at any time. To delete your
              account, your bank details and your page, ask the administrator; records that must be
              kept to justify a transfer may be retained in a restricted form.
            </p>
          ),
        },
        {
          title: '9. Your choices',
          body: (
            <p>
              You can ask what is stored about you, correct it, or have it deleted by writing to the
              administrator. Supporters have no personal record to access or delete, because no
              personal data is collected from them.
            </p>
          ),
        },
        {
          title: '10. Children',
          body: <p>GiveFlow is not intended for people under 18, and pages for minors are not accepted.</p>,
        },
        {
          title: '11. Changes',
          body: (
            <p>
              This page may be updated when the service changes; the date at the top shows the latest
              version. Using the service is also governed by the{' '}
              <Link to="/terms" className="font-semibold text-brand-600 hover:underline">terms of use</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}
