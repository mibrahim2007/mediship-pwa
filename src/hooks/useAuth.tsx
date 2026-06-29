import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSession, clearSession, login as authLogin, signup as authSignup, type Session } from '../lib/auth'

interface AuthContextValue {
  user: Session | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  signup: (companyName: string, fullName: string, email: string, username: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    setUser(session)
    setLoading(false)
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const session = await authLogin(identifier, password)
    setUser(session)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const signup = useCallback(async (
    companyName: string, fullName: string, email: string, username: string, password: string
  ) => {
    const session = await authSignup(companyName, fullName, email, username, password)
    setUser(session)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
