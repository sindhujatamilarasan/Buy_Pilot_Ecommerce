import { useEffect, useState } from 'react'
import { getSite } from '../api/site'
import { applyTheme } from '../utils/themes'
import { SiteContext } from './SiteContext'

// Used while loading (or if the server is down) so the shop never shows a broken header
const FALLBACK = {
  theme: 'shopora',
  announcement_enabled: false, announcement_text: '', hero_badge: '', hero_title: 'Welcome to Shopora',
  hero_highlight: '', hero_subtitle: '', footer_tagline: '', perks: [], footer_links: [],
}

export const SiteProvider = ({ children }) => {
  const [site, setSite] = useState(FALLBACK)

  // Load once for the whole app; the admin page calls setSite after saving so changes show at once
  useEffect(() => {
    getSite().then(setSite).catch(() => {})
  }, [])

  // New theme (first load or the admin saved one) → re-colour the whole app
  useEffect(() => {
    applyTheme(site.theme)
  }, [site.theme])

  return <SiteContext.Provider value={{ site, setSite }}>{children}</SiteContext.Provider>
}
