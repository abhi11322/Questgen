import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { UsersAPI } from '../services/api'
import '../styles/login.css'

export default function Login({ role }){
  const { loginWithGoogle, setUser } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const roleQuery = new URLSearchParams(loc.search).get('role')
  const desiredRole = useMemo(() => {
    const viaProp = (role === 'TEACHER' || role === 'STUDENT') ? role : null
    const viaQuery = (roleQuery === 'TEACHER' || roleQuery === 'STUDENT') ? roleQuery : null
    return viaProp || viaQuery || 'TEACHER'
  }, [role, roleQuery])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setError('')
    try{
      setLoading(true)
      const fu = await loginWithGoogle()
      // Try to load backend user mapping
      try {
        const existing = await UsersAPI.byFirebaseUid(fu.uid)
        // If this page enforces a role (via desiredRole from route), correct it server-side if different
        let finalRole = existing.role
        if ((desiredRole === 'TEACHER' || desiredRole === 'STUDENT') && String(existing.role?.name || existing.role || '').trim().toUpperCase() !== desiredRole.toUpperCase()) {
          try { await UsersAPI.update(fu.uid, { role: desiredRole }) } catch {}
          finalRole = desiredRole
        }
        setUser({ ...existing, role: finalRole })
        // Preserve the intended redirect path or use default
        const from = loc.state?.from?.pathname || (finalRole === 'TEACHER' ? '/teacher' : '/student')
        nav(from, { replace: true })
        return
      } catch {}
      // If not exists, register minimal info; ask defaults for role-specific fields
      const payload = {
        firebase_uid: fu.uid,
        email: fu.email,
        first_name: fu.displayName?.split(' ')[0] || 'User',
        last_name: fu.displayName?.split(' ').slice(1).join(' ') || '',
        role: desiredRole,
        department: desiredRole==='TEACHER' ? 'CSE' : undefined,
        semester: desiredRole==='STUDENT' ? 6 : undefined,
      }
      const created = await UsersAPI.register(payload)
      setUser(created)
      const from = loc.state?.from?.pathname || (created.role === 'TEACHER' ? '/teacher' : '/student')
      nav(from, { replace: true })
    }catch(e){
      setError(e.message || 'Login failed')
    }finally{
      setLoading(false)
    }
  }

  const onSubmit = (e)=>{
    e.preventDefault()
    setError('')
    setLoading(true)
    // Form fields present in screenshot but backend has only Firebase; keep as no-op login to guide Google
    setTimeout(()=>{ setLoading(false); setError('Please use Continue with Google. Email/password form is a placeholder.')}, 400)
  }

  return (
    <div className="container center" style={{minHeight:'100vh'}}>
      <div className="login-card card">
        <div className="lock" />
        <h2 className="h2" style={{textAlign:'center'}}>Welcome Back</h2>
        <div className="subtitle" style={{textAlign:'center'}}>Sign in as a {desiredRole==='TEACHER' ? 'Teacher' : 'Student'}</div>
        {error && <div className="error">{error}</div>}
        <button className="btn google" onClick={handleGoogle} disabled={loading}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <div className="or"><span>or</span></div>
        <form onSubmit={onSubmit} className="form">
          <input className="input" placeholder="Email Address*" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Password*" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn" disabled={loading}>Sign In</button>
        </form>
        <div className="muter">Don't have an account? <a className="link" href={desiredRole==='TEACHER'? '/signup/teacher' : '/signup/student'}>Sign up</a></div>
      </div>
    </div>
  )
}
