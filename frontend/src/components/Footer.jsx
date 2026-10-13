const COLUMNS = [
  { title: 'Shop', links: ['New arrivals', 'Electronics', 'Fashion', 'Home & Kitchen'] },
  { title: 'Help', links: ['Shipping', 'Returns', 'Track order', 'Contact us'] },
  { title: 'Company', links: ['About', 'Careers', 'Privacy', 'Terms'] },
]

const Footer = () => (
  <footer className="mt-20 bg-gradient-to-br from-brand-50 via-brand-50 to-mango-100">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
      <div>
        <p className="font-display text-2xl font-extrabold">🛍️ <span className="text-brand">ShopKart</span></p>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Trendy products, honest prices and happy shopping – every day.
        </p>
      </div>
      {COLUMNS.map(column => (
        <div key={column.title}>
          <p className="font-display font-bold text-ink-900">{column.title}</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-500">
            {column.links.map(link => (
              <li key={link} className="cursor-default hover:text-brand-600">{link}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-brand-100 py-5 text-center text-xs text-ink-500">
      © 2026 ShopKart · Made with 💖 using React + Django
    </div>
  </footer>
)

export default Footer
