import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import Modal from '../components/Modal'
import { SchemesAPI, SubjectsAPI, NotesAPI, SimpleNotesAPI } from '../services/api'

export default function StudentPortal(){
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [openNotes, setOpenNotes] = useState(false)
  const [schemes, setSchemes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedScheme, setSelectedScheme] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [syllabus, setSyllabus] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // quick notes state
  const [notes, setNotes] = useState([])
  const [noteError, setNoteError] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({ id:null, title:'', content:'' })
  const [saving, setSaving] = useState(false)

  const loadSchemes = async ()=>{
    try{ const data = await SchemesAPI.list(); setSchemes(data); if(data[0]) setSelectedScheme(String(data[0].id)) }catch(e){ setError(e.message) }
  }
  const loadSubjects = async (sid)=>{
    if(!sid) { setSubjects([]); setSelectedSubject(''); return }
    setLoading(true); setError('')
    try{ const data = await SubjectsAPI.list(Number(sid)); setSubjects(data); if(data[0]) setSelectedSubject(String(data[0].id)) }catch(e){ setError(e.message) } finally { setLoading(false) }
  }
  const loadMaterials = async (sid, subid)=>{
    if(!(sid && subid)) { setSyllabus([]); setModules([]); return }
    setLoading(true); setError('')
    try{
      const [sy, mods] = await Promise.all([
        NotesAPI.syllabus.list(Number(sid), Number(subid)),
        NotesAPI.modules.list(Number(sid), Number(subid))
      ])
      setSyllabus(sy || [])
      setModules(mods || [])
    }catch(e){ setError(e.message) } finally { setLoading(false) }
  }

  useEffect(()=>{ if(open) loadSchemes() }, [open])
  useEffect(()=>{ loadSubjects(selectedScheme) }, [selectedScheme])
  useEffect(()=>{ loadMaterials(selectedScheme, selectedSubject) }, [selectedScheme, selectedSubject])

  const openBlob = (blob)=>{
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(()=> URL.revokeObjectURL(url), 10000)
  }
  const previewSyllabus = async (id)=>{ try{ const res = await NotesAPI.syllabus.file(id); openBlob(res.data) }catch(e){ setError(e.message) } }
  const previewModule = async (id)=>{ try{ const res = await NotesAPI.modules.file(id); openBlob(res.data) }catch(e){ setError(e.message) } }
  const downloadSyllabus = async (id, name='syllabus.pdf')=>{
    try{ const res = await NotesAPI.syllabus.file(id, 1); const url = URL.createObjectURL(res.data); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url) }catch(e){ setError(e.message) }
  }
  const downloadModule = async (id, name='module.pdf')=>{
    try{ const res = await NotesAPI.modules.file(id, 1); const url = URL.createObjectURL(res.data); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url) }catch(e){ setError(e.message) }
  }

  // Quick Notes: backend-first with localStorage fallback
  const notesKey = user?.id ? `quick_notes_${user.id}` : 'quick_notes_anon'
  const lsLoad = ()=> { try{ return JSON.parse(localStorage.getItem(notesKey) || '[]') }catch{ return [] } }
  const lsSave = (arr)=> localStorage.setItem(notesKey, JSON.stringify(arr))

  const loadQuickNotes = async ()=>{
    setNoteError('')
    // Try backend first
    try{
      const data = await SimpleNotesAPI.list(user?.id)
      if(Array.isArray(data)) { setNotes(data); lsSave(data); return }
    }catch{
      // fall back
    }
    setNotes(lsLoad())
  }
  useEffect(()=>{ if(openNotes) loadQuickNotes() }, [openNotes, user?.id])

  // Keep modal state in sync with URL segment so refresh preserves current view
  useEffect(()=>{
    const seg = location.pathname.split('/')[2] || ''
    if(seg === 'notes') { setOpenNotes(true) }
    if(seg === 'materials') { setOpen(true) }
  }, [location.pathname])

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedSearch(search), 250)
    return ()=> clearTimeout(t)
  }, [search])

  const filteredNotes = useMemo(()=>{
    const q = debouncedSearch.trim().toLowerCase()
    if(!q) return notes
    return notes.filter(n=> (n.title||'').toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q))
  }, [notes, debouncedSearch])

  const saveNote = async (e)=>{
    e.preventDefault(); setNoteError(''); if(!draft.title && !draft.content) return
    setSaving(true)
    try{
      if(draft.id){
        // update
        const payload = { title: draft.title, content: draft.content, updatedAt: new Date().toISOString() }
        try { await SimpleNotesAPI.update(draft.id, payload); await loadQuickNotes(); }
        catch { // fallback update
          const arr = lsLoad().map(n=> n.id===draft.id? {...n, ...payload}: n); lsSave(arr); setNotes(arr)
        }
      } else {
        // create
        const payload = { user_id: user?.id, title: draft.title, content: draft.content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        try { await SimpleNotesAPI.create(payload); await loadQuickNotes() }
        catch { const arr = [...lsLoad(), { ...payload, id: Date.now() }]; lsSave(arr); setNotes(arr) }
      }
      setDraft({ id:null, title:'', content:'' })
    }catch(err){ setNoteError(err.message) } finally { setSaving(false) }
  }
  const editNote = (n)=> setDraft({ id: n.id, title: n.title || '', content: n.content || '' })
  const deleteNote = async (id)=>{
    if(!confirm('Delete this note?')) return
    try{
      try{ await SimpleNotesAPI.delete(id); await loadQuickNotes() }
      catch { const arr = lsLoad().filter(n=> n.id!==id); lsSave(arr); setNotes(arr) }
      if(draft.id===id) setDraft({ id:null, title:'', content:'' })
    }catch(err){ setNoteError(err.message) }
  }
  return (
    <div className="container">
      <h1 className="h1">Student Study Portal</h1>
      <p className="subtitle">Welcome back! Here's your personalized study dashboard to help you succeed</p>
      <div className="banner">Hello, <b>{user?.first_name} {user?.last_name}</b></div>
      <div className="dash-grid">
        <div className="dash-tile materials">
          <div className="dash-icon materials" />
          <div className="dash-title">Study Materials</div>
          <div className="dash-desc">Access course materials, notes, and study guides for all your subjects</div>
          <button className="dash-btn materials" onClick={()=>setOpen(true)}>Browse Materials</button>
        </div>

        <div className="dash-tile schedule">
          <div className="dash-icon schedule" />
          <div className="dash-title">Schedule</div>
          <div className="dash-desc">View your class schedule, exam dates, and important events</div>
          <a className="dash-btn schedule" href="/student/schedule">View Schedule</a>
        </div>

        <div className="dash-tile groups">
          <div className="dash-icon groups" />
          <div className="dash-title">Study Groups</div>
          <div className="dash-desc">Join study groups and collaborate with fellow students</div>
          <a className="dash-btn groups" href="/student/groups">Find Groups</a>
        </div>

        <div className="dash-tile notes dash-bottom-left">
          <div className="dash-icon notes" />
          <div className="dash-title">Quick Notes</div>
          <div className="dash-desc">Take quick notes and save important study reminders</div>
          <button className="dash-btn notes" onClick={()=> setOpenNotes(true)}>Open Notes</button>
        </div>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="Study Materials (Notes)" footer={<button className="btn" onClick={()=>setOpen(false)}>Close</button>}>
        {error && <div className="error" style={{marginBottom:8}}>{error}</div>}
        <div style={{display:'flex', gap:8, marginBottom:10}}>
          <select className="input" value={selectedScheme} onChange={e=>setSelectedScheme(e.target.value)}>
            {schemes.map(s=> <option key={s.id} value={s.id}>{s.name} • {s.department}</option>)}
          </select>
          <select className="input" value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)}>
            {subjects.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.subject_code || '—'})</option>)}
          </select>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:14}}>
          <div style={{display:'contents'}}>
            <div><b>Syllabus</b></div>
            <div>{syllabus[0]?.original_filename || 'Not uploaded'}</div>
            <div style={{display:'flex', gap:6}}>
              {syllabus[0] && <button className="btn secondary" onClick={()=> previewSyllabus(syllabus[0].id)} disabled={loading}>Preview</button>}
              {syllabus[0] && <button className="btn" onClick={()=> downloadSyllabus(syllabus[0].id, syllabus[0].original_filename || 'syllabus.pdf')} disabled={loading}>Download</button>}
            </div>
          </div>
          {[1,2,3,4,5].map(m=>{
            const file = modules.find(x=> Number(x.module) === m)
            return (
              <div key={m} style={{display:'contents'}}>
                <div>Module {m}</div>
                <div>{file?.original_filename || 'Not uploaded'}</div>
                <div style={{display:'flex', gap:6}}>
                  {file && <button className="btn secondary" onClick={()=> previewModule(file.id)} disabled={loading}>Preview</button>}
                  {file && <button className="btn" onClick={()=> downloadModule(file.id, file.original_filename || `module_${m}.pdf`)} disabled={loading}>Download</button>}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* Quick Notes Modal */}
      <Modal open={openNotes} onClose={()=> setOpenNotes(false)} title="Quick Notes" footer={<button className="btn" onClick={()=> setOpenNotes(false)}>Close</button>}>
        {noteError && <div className="error" style={{marginBottom:8}}>{noteError}</div>}
        <div style={{display:'flex', gap:8, marginBottom:8}}>
          <input className="input" placeholder="Search notes..." value={search} onChange={e=> setSearch(e.target.value)} />
        </div>
        <form onSubmit={saveNote} className="card" style={{marginBottom:10}}>
          <div className="row">
            <div className="col-4"><input className="input" placeholder="Title" value={draft.title} onChange={e=> setDraft(v=>({...v, title:e.target.value}))} /></div>
            <div className="col-12" style={{marginTop:8}}>
              <textarea className="input" rows={5} placeholder="Start typing..." value={draft.content} onChange={e=> setDraft(v=>({...v, content:e.target.value}))} />
            </div>
            <div className="col-12" style={{marginTop:8}}>
              <button className="btn" disabled={saving}>{saving? 'Saving...' : (draft.id? 'Update Note' : 'Add Note')}</button>
            </div>
          </div>
        </form>
        <div className="card">
          {filteredNotes.length===0 && <div className="subtitle">No notes yet</div>}
          {filteredNotes.map(n=> (
            <div key={n.id} style={{borderBottom:'1px solid var(--border)', padding:'8px 0'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontWeight:600}}>{n.title || 'Untitled'}</div>
                <div style={{display:'flex', gap:6}}>
                  <button className="btn secondary" onClick={()=> editNote(n)}>Edit</button>
                  <button className="btn secondary" onClick={()=> deleteNote(n.id)}>Delete</button>
                </div>
              </div>
              <div style={{whiteSpace:'pre-wrap', fontSize:14, marginTop:4}}>{n.content}</div>
              <div style={{fontSize:12, color:'var(--muted)', marginTop:4}}>
                {n.createdAt && `Created: ${new Date(n.createdAt).toLocaleString()} `}
                {n.updatedAt && ` • Updated: ${new Date(n.updatedAt).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
