// Layout = the frame around pages. <Outlet /> is where the current page appears.
import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

const CustomerLayout = () => (
  <div className="flex min-h-screen flex-col bg-cream">
    <Navbar />
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <Outlet />
    </main>
    <Footer />
  </div>
)

export default CustomerLayout
