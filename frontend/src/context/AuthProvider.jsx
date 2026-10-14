import { useEffect, useState } from 'react'
import { getMe, loginUser, logoutUser, registerUser } from '../api/auth'
import { AuthContext } from './AuthContext'

// Wraps the whole app (see main.jsx) so every page can use useAuth().
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  // Only "loading" if there is a saved token we still need to check
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  // On first load: if a token was saved, ask Django who it belongs to
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('token')) // token expired / invalid
      .finally(() => setLoading(false))
  }, [])

  const saveSession = ({ token, user }) => {
    localStorage.setItem('token', token)
    setUser(user)
    return user
  }

  const login = async credentials => saveSession(await loginUser(credentials))
  const register = async data => saveSession(await registerUser(data))

  const logout = async () => {
    try {
      await logoutUser()
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
