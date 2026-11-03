import { Link } from 'react-router-dom'
import { useSite } from '../hooks/useSite'
import Logo from './Logo'

// Footer links come from Super admin → Site content; links with the same "group" form one column
const groupLinks = links =>
  links.reduce((columns, link) => {
    const column = columns.find(c => c.title === link.group)
    if (column) column.links.push(link)
    else columns.push({ title: link.group, links: [link] })
    return columns
  }, [])

const linkClass = 'hover:text-brand-600'

// Shop pages ("/orders") open inside the app; full addresses ("https://…") open in a new tab
const FooterLink = ({ link }) =>
  link.url.startsWith('/') ? (
    <Link to={link.url} className={linkClass}>{link.label}</Link>
  ) : (
    <a href={link.url} target="_blank" rel="noreferrer" className={linkClass}>{link.label}</a>
  )

const Footer = () => {
  const { site } = useSite()

  return (
    <footer className="mt-20 bg-gradient-to-br from-brand-50 via-brand-50 to-mango-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo className="h-14" />
          {site.footer_tagline && <p className="mt-3 text-sm leading-relaxed text-ink-500">{site.footer_tagline}</p>}
        </div>
        {groupLinks(site.footer_links).map(column => (
          <div key={column.title}>
            <p className="font-display font-bold text-ink-900">{column.title}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink-500">
              {column.links.map((link, index) => (
                <li key={index}><FooterLink link={link} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-100 py-5 text-center text-xs text-ink-500">
        © 2026 Buy Pilot · Made with 💖 using React + Django · Product photos: <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline hover:text-brand-700">Pexels</a>
      </div>
    </footer>
  )
}

export default Footer
