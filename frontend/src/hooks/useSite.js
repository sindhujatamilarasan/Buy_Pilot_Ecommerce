// const { site, setSite } = useSite()
import { useContext } from 'react'
import { SiteContext } from '../context/SiteContext'

export const useSite = () => useContext(SiteContext)
