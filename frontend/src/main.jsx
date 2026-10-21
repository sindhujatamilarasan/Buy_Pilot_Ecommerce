import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider'
import { CartProvider } from './context/CartProvider'
import { SiteProvider } from './context/SiteProvider'
import { WishlistProvider } from './context/WishlistProvider'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>,
)
