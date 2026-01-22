import React, { useEffect, useMemo, useState } from 'react'
import { SchemesAPI, SubjectsAPI, QuestionBanksAPI } from '../services/api'

export default function QuestionBank(){
  const [schemes, setSchemes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [schemeId, setSchemeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [module, setModule] = useState('1')
  const [file, setFile] = useState(null)
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canUpload = useMemo(()=> schemeId && subjectId && module && file, [schemeId, subjectId, module, file])

  const loadSchemes = async ()=>{
    try { const data = await SchemesAPI.list(); setSchemes(data); if(data[0]) setSchemeId(String(data[0].id)) }
    catch(e){ setError(e.message) }
  }
  const loadSubjects = async (sid)=>{
    if(!sid) { setSubjects([]); setSubjectId(''); return }
    try { const data = await SubjectsAPI.list(Number(sid)); setSubjects(data); if(data[0]) setSubjectId(String(data[0].id)) }
    catch(e){ setError(e.message) }
  }
  const loadBanks = async (sid, subid)=>{
    if(!(sid && subid)) { setBanks([]); return }
    try { const data = await QuestionBanksAPI.list(Number(sid), Number(subid)); setBanks(data) }
    catch(e){ setError(e.message) }
  }

  useEffect(()=>{ loadSchemes() }, [])
  useEffect(()=>{ loadSubjects(schemeId) }, [schemeId])
  useEffect(()=>{ loadBanks(schemeId, subjectId) }, [schemeId, subjectId])

  const onUpload = async (e)=>{
    e.preventDefault(); setError('')
    if(!canUpload){ setError('Select scheme, subject, module and choose a PDF'); return }
    try{
      setLoading(true)
      const fd = new FormData()
      fd.append('scheme_id', Number(schemeId))
      fd.append('subject_id', Number(subjectId))
      fd.append('module', Number(module))
      fd.append('file', file)
      await QuestionBanksAPI.upload(fd)
      setFile(null)
      loadBanks(schemeId, subjectId)
    }catch(err){ setError(err.message) } finally{ setLoading(false) }
  }

  const onPreview = async (bankId)=>{
    const res = await QuestionBanksAPI.file(bankId)
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank')
  }
  const onDelete = async (bankId)=>{
    if(!confirm('Delete this question bank?')) return
    try{ await QuestionBanksAPI.delete(bankId); loadBanks(schemeId, subjectId) }catch(e){ alert(e.message) }
  }

  return (
    <div className="container">
      <h1 className="h1">Question Bank</h1>
      <p className="subtitle">Upload PDF banks per subject and module, then preview or remove them</p>
      {error && <div className="error" style={{marginBottom:12}}>{error}</div>}

      <div className="card" style={{marginBottom:16}}>
        <form onSubmit={onUpload} className="row">
          <div className="col-3">
            <label style={{fontSize:12, color:'var(--muted)'}}>Scheme</label>
            <select className="input" value={schemeId} onChange={e=>setSchemeId(e.target.value)}>
              {schemes.map(s=> <option key={s.id} value={s.id}>{s.name} - {s.department}</option>)}
            </select>
          </div>
          <div className="col-3">
            <label style={{fontSize:12, color:'var(--muted)'}}>Subject</label>
            <select className="input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
              {subjects.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.subject_code || '—'})</option>)}
            </select>
          </div>
          <div className="col-2">
            <label style={{fontSize:12, color:'var(--muted)'}}>Module (1-5)</label>
            <input className="input" value={module} onChange={e=>setModule(e.target.value)} placeholder="1-5" />
          </div>
          <div className="col-4">
            <label style={{fontSize:12, color:'var(--muted)'}}>PDF File</label>
            <input className="input" type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="col-12" style={{marginTop:8}}>
            <button className="btn" disabled={!canUpload || loading}>{loading? 'Uploading...' : 'Upload Question Bank'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="row" style={{fontWeight:700, marginBottom:8}}>
          <div className="col-3">Module</div>
          <div className="col-5">File</div>
          <div className="col-2">Questions</div>
          <div className="col-2">Actions</div>
        </div>
        {banks.length === 0 && <div style={{color:'var(--muted)'}}>No banks yet for this subject.</div>}
        {banks.map(b=> (
          <div key={b.id} className="row" style={{alignItems:'center', padding:'8px 0', borderTop:'1px solid var(--border)'}}>
            <div className="col-3">Module {b.module}</div>
            <div className="col-5">{b.file_name}</div>
            <div className="col-2">{b.question_count}</div>
            <div className="col-2" style={{display:'flex', gap:8}}>
              <button className="btn secondary" onClick={()=>onPreview(b.id)}>Preview</button>
              <button className="btn" onClick={()=>onDelete(b.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
