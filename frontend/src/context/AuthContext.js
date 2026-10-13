// Context = a way to share data with ANY component without passing props down every level.
// AuthContext holds: who is logged in, and the login / logout functions.
import { createContext } from 'react'

export const AuthContext = createContext(null)
