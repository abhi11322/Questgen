import React, { useState } from 'react'
import '../styles/studygroups.css'

const demo = [
  { id:1, name:'Math Study Circle', subject:'Mathematics', desc:'Weekly problem-solving sessions', members:12 },
  { id:2, name:'Physics Lab Partners', subject:'Physics', desc:'Collaborative lab work', members:3 },
  { id:3, name:'CS Project Hub', subject:'Computer Science', desc:'Final year project collaboration', members:15 },
  { id:4, name:'Chemistry Revision Group', subject:'Chemistry', desc:'Exam preparation', members:6 },
]

export default function StudyGroups(){
  const [tab, setTab] = useState('available')

  return (
    <div className="container">
      <h2 className="h2" style={{marginBottom:12}}>Study Groups</h2>
      <div className="sg-tabs">
        <button className={`sg-tab ${tab==='available'?'active':''}`} onClick={()=>setTab('available')}>Available Groups</button>
        <button className={`sg-tab ${tab==='my'?'active':''}`} onClick={()=>setTab('my')}>My Groups</button>
        <div style={{flex:1}} />
        <button className="btn small">+ Create Group</button>
      </div>

      {tab==='available' && (
        <div className="sg-grid">
          {demo.map(g=> (
            <div key={g.id} className="sg-card">
              <div className="sg-title">{g.name}</div>
              <div className="sg-subject">{g.subject}</div>
              <div className="sg-desc">{g.desc}</div>
              <div className="sg-footer">
                <span className="badge">{g.members} members</span>
                <button className="btn secondary">Join</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='my' && (
        <div className="sg-empty">You haven't joined any groups yet.</div>
      )}

      <div className="sg-stats">
        <div><div className="muted">Total Groups</div><div className="val">{demo.length}</div></div>
        <div><div className="muted">Total Members</div><div className="val">41</div></div>
        <div><div className="muted">Most Active Subject</div><div className="val">Mathematics</div></div>
      </div>
    </div>
  )
}
