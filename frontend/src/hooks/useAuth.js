// Custom hook: any component can write  const { user, logout } = useAuth()
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export const useAuth = () => useContext(AuthContext)
