const COLUMNS = [
  { title: 'Shop', links: ['New arrivals', 'Electronics', 'Fashion', 'Home & Kitchen'] },
  { title: 'Help', links: ['Shipping', 'Returns', 'Track order', 'Contact us'] },
  { title: 'Company', links: ['About', 'Careers', 'Privacy', 'Terms'] },
]

const Footer = () => (
  <footer className="mt-20 bg-ink-950 text-ink-300">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
      <div>
        <p className="font-serif text-2xl font-semibold text-white">
          Shop<span className="text-gold-400">Kart</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          Curated products, honest prices and service you can trust.
        </p>
      </div>
      {COLUMNS.map(column => (
        <div key={column.title}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">{column.title}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {column.links.map(link => (
              <li key={link} className="cursor-default hover:text-white">{link}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-ink-800 py-5 text-center text-xs text-ink-500">
      © 2026 ShopKart · Built with React + Django
    </div>
  </footer>
)

export default Footer
