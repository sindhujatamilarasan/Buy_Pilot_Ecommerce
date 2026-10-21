// Colour themes the super admin can pick (Admin → Site content). Keys must match backend sitecontent Theme.
// brand = 10 shades (50 lightest → 900 darkest), alt = the 2nd colour of the button gradient, blush = page background.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

export const THEMES = {
  emerald: {
    label: 'Emerald', alt: '#0d9488', blush: '#f7fcf9',
    brand: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  },
  ocean: {
    label: 'Ocean blue', alt: '#4f46e5', blush: '#f7f9fd',
    brand: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  },
  rose: {
    label: 'Rose', alt: '#db2777', blush: '#fdf7f8',
    brand: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
  },
  violet: {
    label: 'Royal violet', alt: '#9333ea', blush: '#f9f7fd',
    brand: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  },
  sunset: {
    label: 'Sunset orange', alt: '#e11d48', blush: '#fdf9f6',
    brand: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  },
}

// Unknown key (old data, server down) → the default theme
export const themeOf = key => THEMES[key] || THEMES.emerald

// shade(theme, 500) → '#10b981'
export const shade = (theme, value) => theme.brand[SHADES.indexOf(value)]

// Overwrite the CSS variables from index.css → every bg-brand-*, text-brand-*… class changes colour at once
export const applyTheme = key => {
  const theme = themeOf(key)
  const root = document.documentElement.style
  SHADES.forEach((value, i) => root.setProperty(`--color-brand-${value}`, theme.brand[i]))
  root.setProperty('--color-brand-alt', theme.alt)
  root.setProperty('--color-blush', theme.blush)
}
