import { Download, ExternalLink, Heart, Landmark, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useUser } from '../hooks/useUser'
import { ADMIN_EMAILS, isAdminEmail } from '../lib/admin'
import {
  getAllDonations,
  getAllProfiles,
  getAdminActions,
  getPayoutAccounts,
  recordAdminAction,
  updateDonationStatus,
} from '../lib/data'
import { formatMoney, pageUrl, timeAgo } from '../lib/format'
import type { AdminAction, Donation, PayoutAccount, Profile } from '../lib/types'

const payoutLabel: Record<Profile['payout_method'], string> = {
  none: 'Not set',
  bank: 'Bank transfer',
}

type ActionDialog = {
  kind: 'approve' | 'reject' | 'mark_paid'
  targetId: string
  targetLabel: string
}

export function Admin() {
  const { user, loading: userLoading } = useUser()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([])
  const [actions, setActions] = useState<AdminAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [dialog, setDialog] = useState<ActionDialog | null>(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([getAllProfiles(), getAllDonations(), getPayoutAccounts(), getAdminActions()])
      .then(([allProfiles, allDonations, allAccounts, allActions]) => {
        setProfiles(allProfiles)
        setDonations(allDonations)
        setPayoutAccounts(allAccounts)
        setActions(allActions)
      })
      .catch(() => setError('Could not load admin data.'))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    donations.forEach((donation) => {
      if (donation.status !== 'completed' && donation.status !== 'paid') return
      const current = map.get(donation.recipient_id) ?? { total: 0, count: 0 }
      current.total += donation.amount_cents
      current.count += 1
      map.set(donation.recipient_id, current)
    })
    return map
  }, [donations])

  const filtered = profiles.filter((profile) =>
    `${profile.full_name} ${profile.handle} ${profile.payout_email}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  const totalRaised = donations
    .filter((d) => d.status === 'completed' || d.status === 'paid')
    .reduce((sum, d) => sum + d.amount_cents, 0)
  const paidOut = donations
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.amount_cents, 0)
  const pending = donations.filter((d) => d.status === 'pending').length

  if (userLoading) {
    return <div className="mx-auto max-w-6xl px-5 py-24 text-center text-sm text-slate-500">Loading…</div>
  }
  if (!user) return <Navigate to="/signin" replace />

  if (!isAdminEmail(user.email)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <div className="card p-9 text-center">
          <ShieldCheck className="mx-auto text-rose-500" size={46} />
          <h1 className="mt-5 text-2xl font-extrabold">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            You are signed in as <strong>{user.email}</strong>. Admin access is limited to:{' '}
            {ADMIN_EMAILS.map((email) => <strong key={email} className="block">{email}</strong>)}.
          </p>
          <Link to="/dashboard" className="primary-btn mt-8">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  function exportCsv() {
    const rows: string[][] = [
      ['Handle', 'Name', 'Headline', 'Story', 'Payout method', 'Payout email', 'Total raised USD', 'Donations', 'Joined'],
      ...profiles.map((p) => [
        p.handle,
        p.full_name,
        p.headline,
        p.story,
        payoutLabel[p.payout_method],
        p.payout_email,
        ((totals.get(p.id)?.total ?? 0) / 100).toFixed(2),
        String(totals.get(p.id)?.count ?? 0),
        new Date(p.created_at).toLocaleDateString('en-US'),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'giveflow-recipients.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function openProfile(profile: Profile) {
    setSelected(profile)
    try {
      const logged = await recordAdminAction({
        admin_id: user!.id,
        admin_email: user!.email,
        action: 'view_profile',
        target_id: profile.id,
        target_label: `@${profile.handle}`,
        reason: 'Profile and payout details consultation',
      })
      setActions((current) => [logged, ...current])
    } catch {
      // The consultation still works if the audit write fails.
    }
  }

  function askDecision(id: string, decision: ActionDialog['kind']) {
    const donation = donations.find((d) => d.id === id)
    const recipient = profiles.find((p) => p.id === donation?.recipient_id)
    setNotice('')
    setReason('')
    setDialog({
      kind: decision,
      targetId: id,
      targetLabel: `@${recipient?.handle ?? 'unknown'} · ${formatMoney(donation?.amount_cents ?? 0)}`,
    })
  }

  function askMarkPaid(id: string) {
    askDecision(id, 'mark_paid')
  }

  function downloadJson() {
    const json = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        warning: 'Full payout details. Restricted to the two admin accounts. Keep this file secure.',
        payout_accounts: payoutAccounts,
      },
      null,
      2,
    )
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'giveflow-payout-accounts.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function confirmDialog() {
    if (!dialog) return
    const note = reason.trim()
    if (dialog.kind === 'reject' && !note) {
      setError('A reason is required to reject a donation.')
      return
    }
    setError('')
    try {
      const nextStatus = dialog.kind === 'approve'
        ? 'completed'
        : dialog.kind === 'mark_paid'
          ? 'paid'
          : 'rejected'
      const updated = await updateDonationStatus(dialog.targetId, nextStatus)
      setDonations((current) => current.map((d) => (d.id === dialog.targetId ? updated : d)))
      const logged = await recordAdminAction({
        admin_id: user!.id,
        admin_email: user!.email,
        action: dialog.kind,
        target_id: dialog.targetId,
        target_label: dialog.targetLabel,
        reason: note || (dialog.kind === 'mark_paid' ? 'Manual transfer completed' : 'Approved without additional note'),
      })
      setActions((current) => [logged, ...current])
      const verb = dialog.kind === 'approve' ? 'approved' : dialog.kind === 'mark_paid' ? 'marked as paid' : 'rejected'
      setNotice(`Donation ${verb} and logged.`)
      setDialog(null)
      setReason('')
    } catch {
      setError('Could not record this action.')
    }
  }

  const kpis = [
    { label: 'Total raised', value: formatMoney(totalRaised), icon: Heart, accent: 'text-brand-600 bg-brand-500/10' },
    { label: 'Paid out', value: formatMoney(paidOut), icon: Landmark, accent: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Recipients', value: String(profiles.length), icon: Users, accent: 'text-sky-600 bg-sky-500/10' },
    { label: 'Awaiting review', value: String(pending), icon: ShieldCheck, accent: 'text-amber-600 bg-amber-500/10' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600">
            <ShieldCheck size={15} /> Admin console
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">All recipients & donations</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
        </div>
        <button onClick={exportCsv} className="ghost-btn">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}><Icon size={18} /></div>
            <p className="mt-5 text-2xl font-extrabold tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <section className="card mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">People asking for support</h2>
            <p className="mt-1 text-xs text-slate-500">Profiles, stories and bank details. Click a row for full details.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !py-2 pl-9 text-sm"
              placeholder="Search name, handle, e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No recipient matches this search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Person</th>
                  <th className="px-5 py-3 font-semibold">Payout</th>
                  <th className="px-5 py-3 text-right font-semibold">Raised</th>
                  <th className="px-5 py-3 text-right font-semibold">Gifts</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((profile) => {
                  const stats = totals.get(profile.id)
                  return (
                    <tr key={profile.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => void openProfile(profile)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={profile.full_name} color={profile.avatar_color} size="sm" />
                          <div>
                            <p className="font-semibold">{profile.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500">@{profile.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{payoutLabel[profile.payout_method]}</p>
                        <p className="text-xs text-slate-500">{profile.payout_email || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">{formatMoney(stats?.total ?? 0)}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{stats?.count ?? 0}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{new Date(profile.created_at).toLocaleDateString('en-US')}</td>
                      <td className="px-5 py-4 text-right"><ExternalLink size={15} className="text-slate-300" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mt-8 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-bold">All donations</h2>
          <p className="mt-1 text-xs text-slate-500">Donors are anonymous — only the amount, recipient and date are stored.</p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
        ) : donations.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No donations recorded yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Recipient</th>
                  <th className="px-5 py-3 font-semibold">Provider</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((donation) => {
                  const recipient = profiles.find((p) => p.id === donation.recipient_id)
                  return (
                    <tr key={donation.id}>
                      <td className="px-5 py-3 font-medium">@{recipient?.handle ?? 'deleted'}</td>
                      <td className="px-5 py-3 text-slate-500">{donation.provider}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          donation.status === 'pending' ? 'bg-amber-50 text-amber-700'
                            : donation.status === 'rejected' ? 'bg-rose-50 text-rose-700'
                              : donation.status === 'paid' ? 'bg-emerald-700 text-white'
                                : 'bg-sky-50 text-sky-700'
                        }`}>{donation.status}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{timeAgo(donation.created_at)}</td>
                      <td className="px-5 py-3 text-right font-bold">{formatMoney(donation.amount_cents)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {donation.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => askDecision(donation.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Approve</button>
                            <button onClick={() => askDecision(donation.id, 'reject')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50">Reject</button>
                          </div>
                        ) : donation.status === 'completed' ? (
                          <button onClick={() => askMarkPaid(donation.id)} className="rounded-lg bg-ink-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-900">Mark paid</button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Landmark size={17} className="text-brand-600" />
              <h2 className="text-base font-bold">Bank details (JSON)</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Full account coordinates for manual transfers, visible only to the two admin accounts. Paid out so far: <strong>{formatMoney(paidOut)}</strong>.
            </p>
          </div>
          <button onClick={downloadJson} className="ghost-btn">
            <Download size={16} /> Download JSON
          </button>
        </div>
        {payoutAccounts.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No bank details submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Recipient</th>
                  <th className="px-5 py-3 font-semibold">Account holder</th>
                  <th className="px-5 py-3 font-semibold">Bank</th>
                  <th className="px-5 py-3 font-semibold">Routing</th>
                  <th className="px-5 py-3 font-semibold">Account number</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutAccounts.map((account) => {
                  const recipient = profiles.find((p) => p.id === account.recipient_id)
                  return (
                    <tr key={account.id}>
                      <td className="px-5 py-3 font-medium">@{recipient?.handle ?? 'deleted'}</td>
                      <td className="px-5 py-3">{account.account_holder || '—'}</td>
                      <td className="px-5 py-3">{account.bank_name || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs">{account.routing_number || '—'}</td>
                      <td className="select-all px-5 py-3 font-mono text-xs font-bold">{account.account_number || '—'}</td>
                      <td className="px-5 py-3 capitalize">{account.account_type}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{new Date(account.updated_at).toLocaleDateString('en-US')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {payoutAccounts.length > 0 && (
          <details className="border-t border-slate-100 bg-slate-950 px-5 py-4">
            <summary className="cursor-pointer text-xs font-semibold text-slate-300">View full JSON</summary>
            <pre className="mt-3 max-h-72 overflow-auto text-[11px] leading-relaxed text-emerald-300">
{JSON.stringify(payoutAccounts, null, 2)}
            </pre>
          </details>
        )}
      </section>

      <section className="card mt-8 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-bold">Audit trail</h2>
          <p className="mt-1 text-xs text-slate-500">Every consultation and decision is recorded with its author and reason.</p>
        </div>
        {actions.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No admin actions recorded yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Admin</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Target</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((action) => (
                  <tr key={action.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{timeAgo(action.created_at)}</td>
                    <td className="px-5 py-3 font-medium">{action.admin_email}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{action.action}</span></td>
                    <td className="px-5 py-3 text-slate-600">{action.target_label}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{action.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        Admin accounts: {ADMIN_EMAILS.join(' · ')}. Bank details are stored in Supabase and readable only by these two accounts through RLS policies. No password is ever stored. Keep the exported JSON file secure.
      </p>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selected.full_name} color={selected.avatar_color} size="md" />
                <div>
                  <h3 className="text-lg font-extrabold">{selected.full_name || 'Unnamed'}</h3>
                  <p className="text-xs text-slate-500">@{selected.handle}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Raised</p>
                <p className="mt-1 font-bold text-emerald-600">{formatMoney(totals.get(selected.id)?.total ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Gifts</p>
                <p className="mt-1 font-bold">{totals.get(selected.id)?.count ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Joined</p>
                <p className="mt-1 text-sm font-bold">{new Date(selected.created_at).toLocaleDateString('en-US')}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Headline</dt><dd className="mt-1 text-slate-700">{selected.headline || '—'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Story</dt><dd className="mt-1 whitespace-pre-line text-slate-700">{selected.story || '—'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payout method</dt><dd className="mt-1 text-slate-700">{payoutLabel[selected.payout_method]}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payout e-mail</dt><dd className="mt-1 text-slate-700">{selected.payout_email || '—'}</dd></div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bank details</dt>
                <dd className="mt-1 text-slate-700">
                  {(() => {
                    const account = payoutAccounts.find((a) => a.recipient_id === selected.id)
                    if (!account) return <span className="text-slate-400">Not submitted yet.</span>
                    return (
                      <span className="block space-y-1 rounded-xl bg-slate-50 p-3 font-mono text-xs">
                        <span className="block font-sans text-sm font-semibold">{account.account_holder || '—'} · {account.bank_name || '—'}</span>
                        <span className="block">Routing: {account.routing_number || '—'}</span>
                        <span className="block font-bold">Account: {account.account_number || '—'}</span>
                        <span className="block capitalize">Type: {account.account_type}</span>
                        {account.note && <span className="block font-sans text-slate-500">{account.note}</span>}
                      </span>
                    )
                  })()}
                </dd>
              </div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Public page</dt><dd className="mt-1 break-all"><a className="text-brand-600 hover:underline" href={pageUrl(selected.handle)} target="_blank" rel="noreferrer">{pageUrl(selected.handle)}</a></dd></div>
            </dl>

            <h4 className="mt-7 text-sm font-bold">Their donations</h4>
            <ul className="mt-2 divide-y divide-slate-100">
              {donations.filter((d) => d.recipient_id === selected.id).map((d) => (
                <li key={d.id} className="flex justify-between py-2.5 text-sm">
                  <span className="text-slate-500">{timeAgo(d.created_at)}</span>
                  <span className="font-bold text-emerald-600">{formatMoney(d.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm admin action">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold">
                  {dialog.kind === 'approve'
                    ? 'Approve donation'
                    : dialog.kind === 'mark_paid'
                      ? 'Mark as paid'
                      : 'Reject donation'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{dialog.targetLabel}</p>
              </div>
              <button onClick={() => setDialog(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <label className="label mt-6" htmlFor="adminReason">
              Reason {dialog.kind === 'reject' ? '(required)' : '(optional)'}
            </label>
            <textarea
              id="adminReason"
              rows={3}
              maxLength={280}
              className="input resize-none"
              placeholder={
                dialog.kind === 'reject'
                  ? 'Explain why this donation is being rejected…'
                  : dialog.kind === 'mark_paid'
                    ? 'Transfer reference or note (optional)…'
                    : 'Add a note for the audit trail…'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDialog(null)} className="ghost-btn">Cancel</button>
              <button
                onClick={() => void confirmDialog()}
                className={
                  dialog.kind === 'reject'
                    ? 'rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700'
                    : dialog.kind === 'mark_paid'
                      ? 'rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800'
                      : 'primary-btn'
                }
              >
                {dialog.kind === 'approve'
                  ? 'Confirm approval'
                  : dialog.kind === 'mark_paid'
                    ? 'Confirm payout'
                    : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
