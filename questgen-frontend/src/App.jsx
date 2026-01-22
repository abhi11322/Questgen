import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import RoleSelect from './pages/RoleSelect'
import Login from './pages/Login'
import TeacherDashboard from './pages/TeacherDashboard'
import Schemes from './pages/Schemes'
import Subjects from './pages/Subjects'
import PaperBuilder from './pages/PaperBuilder'
import StudentPortal from './pages/StudentPortal'
import StudyGroups from './pages/StudyGroups'
import StudentSchedule from './pages/StudentSchedule'
import QuestionBank from './pages/QuestionBank'
import Signup from './pages/Signup'
import { useAuth } from './state/AuthContext'

// RootGate: Always show RoleSelect at '/', regardless of auth state.
// Redirection to role pages should occur only after an explicit successful login/signup.
function RootGate(){
  return <RoleSelect />
}

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="container center" style={{ minHeight: '100vh' }}>
        <div className="card" style={{ width: 420, textAlign: 'center' }}>Loading...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  // Normalize role values before comparison, avoid assuming non-teacher is student
  const userRole = String(user.role?.name || user.role || '').trim().toUpperCase()
  const requiredRole = role ? String(role?.name || role || '').trim().toUpperCase() : null
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <div className="card">Access denied: this page is restricted.</div>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/teacher" element={<Login role="TEACHER" />} />
      <Route path="/login/student" element={<Login role="STUDENT" />} />
      <Route path="/signup/teacher" element={<Signup role="TEACHER" />} />
      <Route path="/signup/student" element={<Signup role="STUDENT" />} />

      <Route path="/teacher" element={
        <PrivateRoute role="TEACHER"><TeacherDashboard /></PrivateRoute>
      } />
      <Route path="/teacher/schemes" element={
        <PrivateRoute role="TEACHER"><Schemes /></PrivateRoute>
      } />
      <Route path="/teacher/subjects" element={
        <PrivateRoute role="TEACHER"><Subjects /></PrivateRoute>
      } />
      <Route path="/teacher/question-bank" element={
        <PrivateRoute role="TEACHER"><QuestionBank /></PrivateRoute>
      } />
      <Route path="/teacher/paper-builder" element={
        <PrivateRoute role="TEACHER"><PaperBuilder /></PrivateRoute>
      } />
      <Route path="/teacher/*" element={
        <PrivateRoute role="TEACHER"><TeacherDashboard /></PrivateRoute>
      } />

      <Route path="/student" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />
      <Route path="/student/groups" element={
        <PrivateRoute role="STUDENT"><StudyGroups /></PrivateRoute>
      } />
      <Route path="/student/schedule" element={
        <PrivateRoute role="STUDENT"><StudentSchedule /></PrivateRoute>
      } />
      <Route path="/student/*" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />

      {/** Map common top-level paths to student portal to preserve path on refresh */}
      <Route path="/notes" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />
      <Route path="/materials" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />
      <Route path="/todo" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute role="STUDENT"><StudentPortal /></PrivateRoute>
      } />

      <Route path="*" element={<div className="container" style={{padding:24}}><div className="card">Page not found</div></div>} />
    </Routes>
  )
}
