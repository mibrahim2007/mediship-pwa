import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export const SESSION_KEY = 'mediship_pwa_session'

export interface Session {
  userId: string
  companyId: string
  fullName: string
  email: string
  role: string
  username: string
  loginAt: string
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function setSession(data: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function login(identifier: string, password: string): Promise<Session> {
  const isEmail = identifier.includes('@')

  const { data: user, error } = await supabase
    .from('users')
    .select('id, company_id, full_name, email, username, password_hash, role, is_active, platform_role')
    .or(isEmail ? `email.eq.${identifier}` : `username.eq.${identifier}`)
    .single()

  if (error || !user) throw new Error('Invalid username or password')
  if (!user.is_active) throw new Error('Account is disabled')
  if (user.platform_role) throw new Error('Invalid credentials')
  if (!user.company_id) throw new Error('No company associated')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Invalid username or password')

  const session: Session = {
    userId: user.id,
    companyId: user.company_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    username: user.username,
    loginAt: new Date().toISOString(),
  }

  setSession(session)
  return session
}

export async function signup(
  companyName: string,
  fullName: string,
  email: string,
  username: string,
  password: string
): Promise<Session> {
  // Check if username already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) throw new Error('Username already taken')

  const { data: existingEmail } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingEmail) throw new Error('Email already registered')

  // Create company
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .insert({ name: companyName, currency: 'PKR', timezone: 'Asia/Karachi' })
    .select('id')
    .single()

  if (companyErr || !company) throw new Error('Failed to create company')

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: user, error: userErr } = await supabase
    .from('users')
    .insert({
      company_id: company.id,
      full_name: fullName,
      email,
      username,
      password_hash: passwordHash,
      role: 'super_admin',
      is_active: true,
    })
    .select('id, company_id, full_name, email, username, role')
    .single()

  if (userErr || !user) {
    await supabase.from('companies').delete().eq('id', company.id)
    throw new Error('Failed to create user account')
  }

  const session: Session = {
    userId: user.id,
    companyId: user.company_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    username: user.username,
    loginAt: new Date().toISOString(),
  }

  setSession(session)
  return session
}

export function generateOrderNo(prefix: string, count: number): string {
  const date = new Date()
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}-${yy}${mm}-${seq}`
}
