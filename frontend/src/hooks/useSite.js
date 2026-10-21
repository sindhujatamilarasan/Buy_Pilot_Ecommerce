// const { site, setSite } = useSite()
import { useContext } from 'react'
import { SiteContext } from '../context/SiteContext'
import { themeOf } from '../utils/themes'

export const useSite = () => useContext(SiteContext)

// Colours of the current theme, for places that can't use Tailwind classes (charts, Razorpay popup)
export const useThemeColors = () => themeOf(useSite().site.theme)
