import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import '../styles/dashboard.css'

export default function TeacherDashboard(){
  const { user } = useAuth()
  return (
    <div className="container">
      <h1 className="h1">Teacher Dashboard</h1>
      <p className="subtitle">Manage your academic schemes, subjects, and question papers</p>
      <div className="banner">Hello, <b>{user?.first_name} {user?.last_name}</b></div>
      <div className="dash-grid">
        <div className="dash-tile schemes">
          <div className="dash-icon schemes" />
          <div className="dash-title">Schemes</div>
          <div className="dash-desc">Create and manage academic schemes across departments</div>
          <Link to="/teacher/schemes" className="dash-btn schemes">Manage Schemes</Link>
        </div>

        <div className="dash-tile subjects">
          <div className="dash-icon subjects" />
          <div className="dash-title">Subjects</div>
          <div className="dash-desc">Add subjects, set credits and map them to schemes</div>
          <Link to="/teacher/subjects" className="dash-btn subjects">Manage Subjects</Link>
        </div>

        <div className="dash-tile bank">
          <div className="dash-icon bank" />
          <div className="dash-title">Question Bank</div>
          <div className="dash-desc">Upload, organize and review the question bank</div>
          <Link to="/teacher/question-bank" className="dash-btn bank">View Bank</Link>
        </div>

        <div className="dash-tile papers dash-bottom-left">
          <div className="dash-icon papers" />
          <div className="dash-title">Question Papers</div>
          <div className="dash-desc">Build question papers from bank and export</div>
          <Link to="/teacher/paper-builder" className="dash-btn papers">Manage Papers</Link>
        </div>
      </div>
    </div>
  )
}
