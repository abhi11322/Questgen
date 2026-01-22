import React, { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { UsersAPI } from '../services/api'
import '../styles/login.css'

export default function Signup({ role }){
  const { loginWithGoogle, setUser } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const roleQuery = new URLSearchParams(loc.search).get('role')
  const desiredRole = useMemo(() => {
    const viaProp = (role === 'TEACHER' || role === 'STUDENT') ? role : null
    const viaQuery = (roleQuery === 'TEACHER' || roleQuery === 'STUDENT') ? roleQuery : null
    return viaProp || viaQuery || 'STUDENT'
  }, [role, roleQuery])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  // teacher specific
  const [department, setDepartment] = useState('CSE')
  // student specific
  const [semester, setSemester] = useState('6')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async ()=>{
    setError('')
    if(!firstName){ setError('First name is required'); return }
    try{
      setLoading(true)
      // Bind account via Google to get firebase_uid
      const fu = await loginWithGoogle()
      const payload = {
        firebase_uid: fu.uid,
        email: email || fu.email,
        first_name: firstName || (fu.displayName?.split(' ')[0] || ''),
        last_name: lastName || (fu.displayName?.split(' ').slice(1).join(' ') || ''),
        role: desiredRole,
        department: desiredRole==='TEACHER' ? (department || 'CSE') : undefined,
        semester: desiredRole==='STUDENT' ? (semester? Number(semester): undefined) : undefined,
      }
      const created = await UsersAPI.register(payload)
      setUser(created)
      const from = loc.state?.from?.pathname || (created.role === 'TEACHER' ? '/teacher' : '/student')
      nav(from, { replace: true })
    }catch(e){
      setError(e.message || 'Signup failed')
    }finally{ setLoading(false) }
  }

  return (
    <div className="container center" style={{minHeight:'100vh'}}>
      <div className="login-card card" style={{maxWidth:520}}>
        <div className="lock" />
        <h2 className="h2" style={{textAlign:'center'}}>Create your account</h2>
        <div className="subtitle" style={{textAlign:'center'}}>Sign up as a {desiredRole==='TEACHER' ? 'Teacher' : 'Student'}</div>
        {error && <div className="error">{error}</div>}
        <div className="form">
          <div className="row">
            <div className="col-6"><input className="input" placeholder="First name*" value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
            <div className="col-6"><input className="input" placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
            <div className="col-12"><input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            {desiredRole==='TEACHER' && (
              <div className="col-12"><input className="input" placeholder="Department" value={department} onChange={e=>setDepartment(e.target.value)} /></div>
            )}
            {desiredRole==='STUDENT' && (
              <div className="col-12"><input className="input" placeholder="Semester" value={semester} onChange={e=>setSemester(e.target.value)} /></div>
            )}
            <div className="col-12" style={{marginTop:8}}>
              <button className="btn google" onClick={handleSignup} disabled={loading}>{loading? 'Creating...' : 'Sign up with Google'}</button>
            </div>
          </div>
        </div>
        <div className="muter">Already have an account? <a className="link" href={desiredRole==='TEACHER'? '/login/teacher' : '/login/student'}>Sign in</a></div>
      </div>
    </div>
  )
}
