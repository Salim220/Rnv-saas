import { ArrowRight, Heart, Link2, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'

const steps = [
  {
    icon: Link2,
    title: 'Claim your page',
    text: 'Sign in with a one-time code sent to your e-mail. No password to remember.',
  },
  {
    icon: Heart,
    title: 'Share your link',
    text: 'Tell your story, pick a suggested amount, and send your personal link anywhere.',
  },
  {
    icon: Wallet,
    title: 'Get paid out',
    text: 'Supporters pay by card or bank. Your payout lands in your connected account.',
  },
]

function PreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-brand-500/30 to-sky-400/20 blur-2xl" />
      <div className="relative rounded-3xl border border-white/15 bg-white p-7 text-slate-900 shadow-2xl">
        <div className="flex items-center gap-4">
          <Avatar name="Jane Miller" size="lg" />
          <div>
            <p className="text-lg font-bold">Jane Miller</p>
            <p className="text-sm text-slate-500">Freelance illustrator</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-slate-600">
          I'm saving up for a studio upgrade so I can take on more freelance work. Every little bit helps.
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {['$10', '$25', '$50', '$100'].map((amount) => (
            <div key={amount} className="rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700">
              {amount}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border-2 border-brand-500/60 bg-brand-500/5 py-3 text-center text-sm font-semibold text-brand-600">
          Support Jane
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} /> Reviewed by admin, paid out manually
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute -right-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -left-24 h-[28rem] w-[28rem] rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-16 px-5 py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-500">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Simple, personal support
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Let people support you,{' '}
              <span className="text-brand-500">directly.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              One page for your story. One link to share. Supporters send a request and you follow every step until the payout reaches your bank.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/signin" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-ink-950 transition hover:bg-brand-600">
                Create your page <ArrowRight size={17} />
              </Link>
              <Link to="/u/jane" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                See an example page
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-500" /> No bank details stored here</span>
              <span className="flex items-center gap-2"><Heart size={16} className="text-brand-500" /> E-mail code sign-in</span>
            </div>
          </div>

          <PreviewCard />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">From zero to your first donation in minutes.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="card p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                <Icon size={21} />
              </div>
              <p className="mt-6 text-xs font-bold text-slate-400">STEP 0{index + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Ready to share your link?</h2>
            <p className="mt-1 text-sm text-slate-500">Free prototype. No card required to try it.</p>
          </div>
          <Link to="/signin" className="primary-btn">
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <p className="mx-auto max-w-6xl px-5 py-8 text-xs leading-relaxed text-slate-400">
        GiveFlow is a prototype. Donations to individuals are generally not tax-deductible in the United States. No money is moved in this demo.
      </p>
    </>
  )
}
