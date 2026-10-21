import { useState } from 'react'
import { saveSite } from '../../api/site'
import { useSite } from '../../hooks/useSite'
import { getErrorMessage } from '../../utils/format'
import { adminCard, adminInput } from './adminStyles'
import ListEditor from './ListEditor'

// React needs a stable key per row; the server does not need it, so it is added here and removed on save
const withKeys = rows => rows.map(row => ({ key: crypto.randomUUID(), ...row }))
const withoutKeys = rows => rows.map(({ key: _key, ...row }) => row)

const PERK_FIELDS = [
  { name: 'icon', placeholder: 'Emoji', maxLength: 8, required: true },
  { name: 'title', placeholder: 'Title, e.g. Free shipping', maxLength: 40, required: true },
  { name: 'text', placeholder: 'Small text, e.g. On orders above ₹500', maxLength: 80 },
]
const LINK_FIELDS = [
  { name: 'group', placeholder: 'Column, e.g. Help', maxLength: 30, required: true },
  { name: 'label', placeholder: 'Link text', maxLength: 40, required: true },
  { name: 'url', placeholder: '/orders or https://…', maxLength: 300, required: true },
]

const Section = ({ title, hint, children }) => (
  <section className={`${adminCard} space-y-4 p-6`}>
    <div>
      <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-500">{hint}</p>
    </div>
    {children}
  </section>
)

const Field = ({ label, ...props }) => (
  <label className="block text-xs font-bold text-ink-500">{label}
    <input {...props} className={`${adminInput} mt-1 w-full`} />
  </label>
)

const SiteContentForm = ({ initial }) => {
  const { setSite } = useSite()
  const [form, setForm] = useState({ ...initial, perks: withKeys(initial.perks), footer_links: withKeys(initial.footer_links) })
  const [message, setMessage] = useState(null) // { ok: true/false, text }
  const [saving, setSaving] = useState(false)
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const text = field => ({ value: form[field], onChange: e => set(field, e.target.value) })

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const saved = await saveSite({ ...form, perks: withoutKeys(form.perks), footer_links: withoutKeys(form.footer_links) })
      setSite(saved) // the shop header / home / footer update without a refresh
      setMessage({ ok: true, text: 'Saved – shoppers see the new content now.' })
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Announcement strip" hint="The thin bar above the shop menu. Only promise what the shop really does.">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={form.announcement_enabled} onChange={e => set('announcement_enabled', e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Show the strip
        </label>
        <Field label="Text" maxLength={160} {...text('announcement_text')} placeholder="🎉 Free shipping on orders above ₹500" />
      </Section>

      <Section title="Home page banner" hint="The big banner at the top of the home page.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Badge (small pill)" maxLength={60} {...text('hero_badge')} placeholder="✨ Festive Sale is live" />
          <Field label="Title *" required maxLength={80} {...text('hero_title')} />
          <Field label="Coloured part of the title" maxLength={60} {...text('hero_highlight')} />
          <Field label="Subtitle" maxLength={200} {...text('hero_subtitle')} />
        </div>
      </Section>

      <Section title="Perks" hint="Up to 6 cards under the banner. Leave empty to hide them.">
        <ListEditor rows={form.perks} onChange={rows => set('perks', rows)} fields={PERK_FIELDS} columns="sm:grid-cols-[80px_1fr_1.5fr_auto]"
          newRow={{ icon: '⭐', title: '', text: '' }} addLabel="Add perk" max={6} />
      </Section>

      <Section title="Footer" hint="Links with the same column name are shown together. Use a shop page (/orders) or a full address (https://…).">
        <Field label="Tagline under the logo" maxLength={200} {...text('footer_tagline')} />
        <ListEditor rows={form.footer_links} onChange={rows => set('footer_links', rows)} fields={LINK_FIELDS} columns="sm:grid-cols-[1fr_1fr_1.6fr_auto]"
          newRow={{ group: 'Help', label: '', url: '' }} addLabel="Add link" max={40} />
      </Section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-4 rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-ink-300/20 backdrop-blur">
        <button disabled={saving} className="bg-brand rounded-full px-7 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {message && <p className={`text-sm font-semibold ${message.ok ? 'text-brand-700' : 'text-rose-600'}`}>{message.text}</p>}
      </div>
    </form>
  )
}

export default SiteContentForm
