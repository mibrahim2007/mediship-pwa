import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, WifiOff, Building2, User, Lock, Mail, AtSign } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/Toast'

type Tab = 'login' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, signup } = useAuth()
  const { toast } = useToast()
  const isOnline = useOnline()

  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Login form
  const [loginId, setLoginId] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // Signup form
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginId.trim() || !loginPass) return
    setLoading(true)
    try {
      await login(loginId.trim(), loginPass)
      navigate('/dashboard')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPass) {
      toast('Passwords do not match', 'error')
      return
    }
    if (password.length < 6) {
      toast('Password must be at least 6 characters', 'error')
      return
    }
    setLoading(true)
    try {
      await signup(companyName, fullName, email, username, password)
      toast('Account created successfully!', 'success')
      navigate('/dashboard')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Signup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-medium flex items-center gap-2 px-4 py-2">
          <WifiOff className="h-3.5 w-3.5" />
          You're offline — login requires internet
        </div>
      )}

      {/* Logo area */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6 text-white">
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-xl">
          <span className="text-4xl font-black text-white">M</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">MediShip</h1>
        <p className="text-teal-200 text-sm mt-1">Medical Supply & Distribution</p>
      </div>

      {/* Auth card */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-6 pb-10 shadow-2xl"
           style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={[
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={[
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              tab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            Create Account
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Username or Email"
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="username or email@company.pk"
              required
              autoComplete="username"
              leftIcon={<AtSign className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPass(p => !p)}
                        className="text-slate-400 hover:text-slate-600 p-1">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isOnline} className="mt-6">
              Sign In
            </Button>

            {!isOnline && (
              <p className="text-center text-xs text-amber-600">Login requires an internet connection</p>
            )}

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">Demo: <span className="font-mono text-slate-600">pharmaplus.admin</span> / <span className="font-mono text-slate-600">Demo@1234</span></p>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Company Name"
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. PharmaPlus Pvt Ltd"
              required
              leftIcon={<Building2 className="h-4 w-4" />}
            />
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@company.pk"
              required
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '.'))}
              placeholder="e.g. company.admin"
              required
              leftIcon={<AtSign className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPass(p => !p)}
                        className="text-slate-400 hover:text-slate-600 p-1">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Re-enter password"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                        className="text-slate-400 hover:text-slate-600 p-1">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={confirmPass && password !== confirmPass ? 'Passwords do not match' : undefined}
            />

            <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isOnline} className="mt-2">
              Create Account
            </Button>

            <p className="text-center text-xs text-slate-400 pt-1">
              By signing up, you agree to our Terms of Service
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
