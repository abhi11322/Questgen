import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/role.css'

export default function RoleSelect(){
  const nav = useNavigate()
  return (
    <div className="hero container center">
      <div style={{width: '760px'}}>
        <h1 className="h1 center" style={{justifyContent:'center'}}>Welcome to QuestGen</h1>
        <p className="subtitle center" style={{justifyContent:'center'}}>Select your role to continue with a personalized experience</p>
        <div className="role-grid">
          <div className="role-card">
            <div className="icon teacher" />
            <div className="rc-title">Teacher</div>
            <div className="rc-sub">Create courses, manage students, and track progress with powerful tools</div>
            <button className="btn" onClick={()=>nav('/login/teacher')}>Continue</button>
          </div>
          <div className="role-card">
            <div className="icon student" />
            <div className="rc-title">Student</div>
            <div className="rc-sub">Access courses, complete assignments, and learn at your own pace</div>
            <button className="btn" onClick={()=>nav('/login/student')}>Continue</button>
          </div>
        </div>
      </div>
    </div>
  )
}
