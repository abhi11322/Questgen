import React, { useEffect, useMemo, useState } from 'react'
import { SchemesAPI, SubjectsAPI, NotesAPI } from '../services/api'

export default function Subjects(){
  const [schemes, setSchemes] = useState([])
  const [selectedScheme, setSelectedScheme] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name:'', subject_code:'', credits:'', semester:'', description:'' })
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [syllabus, setSyllabus] = useState([])
  const [modules, setModules] = useState([])
  const [opBusy, setOpBusy] = useState(false)

  const loadSchemes = async ()=>{
    try{ const data = await SchemesAPI.list(); setSchemes(data); if(data[0]) setSelectedScheme(String(data[0].id)) }catch(e){ setError(e.message) }
  }
  const loadSubjects = async (sid)=>{
    if(!sid) return; setLoading(true); setError('')
    try{ const data = await SubjectsAPI.list(Number(sid)); setItems(data) }catch(e){ setError(e.message) }finally{ setLoading(false) }
  }

  const loadNotes = async (subject)=>{
    if(!subject) return
    setOpBusy(true)
    try{
      const [sy, mods] = await Promise.all([
        NotesAPI.syllabus.list(Number(selectedScheme), Number(subject.id)),
        NotesAPI.modules.list(Number(selectedScheme), Number(subject.id))
      ])
      setSyllabus(sy || [])
      setModules(mods || [])
    }catch(e){ setError(e.message) } finally{ setOpBusy(false) }
  }

  const onSelectSubject = (s)=>{ setSelectedSubject(s); loadNotes(s) }

  const openBlob = (blob, filename)=>{
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(()=> URL.revokeObjectURL(url), 10000)
  }

  const uploadSyllabus = async (file)=>{
    if(!file || !selectedSubject) return
    const fd = new FormData()
    fd.append('scheme_id', Number(selectedScheme))
    fd.append('subject_id', Number(selectedSubject.id))
    fd.append('file', file)
    setOpBusy(true)
    try{ await NotesAPI.syllabus.upload(fd); await loadNotes(selectedSubject) }catch(e){ setError(e.message) } finally{ setOpBusy(false) }
  }

  const uploadModule = async (moduleNo, file)=>{
    if(!file || !selectedSubject) return
    const fd = new FormData()
    fd.append('scheme_id', Number(selectedScheme))
    fd.append('subject_id', Number(selectedSubject.id))
    fd.append('module', Number(moduleNo))
    fd.append('file', file)
    setOpBusy(true)
    try{ await NotesAPI.modules.upload(fd); await loadNotes(selectedSubject) }catch(e){ setError(e.message) } finally{ setOpBusy(false) }
  }

  const deleteSyllabus = async (id)=>{ setOpBusy(true); try{ await NotesAPI.syllabus.delete(id); await loadNotes(selectedSubject) }catch(e){ setError(e.message) } finally{ setOpBusy(false) } }
  const deleteModule = async (id)=>{ setOpBusy(true); try{ await NotesAPI.modules.delete(id); await loadNotes(selectedSubject) }catch(e){ setError(e.message) } finally{ setOpBusy(false) } }
  const previewSyllabus = async (id)=>{ try{ const res = await NotesAPI.syllabus.file(id); openBlob(res.data, 'syllabus.pdf') }catch(e){ setError(e.message) } }
  const previewModule = async (id)=>{ try{ const res = await NotesAPI.modules.file(id); openBlob(res.data, 'module.pdf') }catch(e){ setError(e.message) } }

  useEffect(()=>{ loadSchemes() }, [])
  useEffect(()=>{ loadSubjects(selectedScheme) }, [selectedScheme])

  const submit = async (e)=>{
    e.preventDefault(); setError('')
    if(!selectedScheme || !form.name){ setError('Select scheme and enter subject name'); return }
    const payload = {
      scheme_id: Number(selectedScheme),
      name: form.name,
      subject_code: form.subject_code || undefined,
      credits: form.credits? Number(form.credits): undefined,
      semester: form.semester? Number(form.semester): undefined,
      description: form.description || undefined,
    }
    try{ await SubjectsAPI.create(payload); setForm({ name:'', subject_code:'', credits:'', semester:'', description:''}); loadSubjects(selectedScheme) }catch(e){ setError(e.message) }
  }

  return (
    <div className="container">
      <h1 className="h1">Subject Management</h1>
      <p className="subtitle">Create and manage subjects for different schemes and departments</p>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{marginBottom:16}}>
        <div className="row">
          <div className="col-3">
            <label style={{fontSize:12, color:'var(--muted)'}}>Selected Scheme</label>
            <select className="input" value={selectedScheme} onChange={e=>setSelectedScheme(e.target.value)}>
              {schemes.map(s=> <option key={s.id} value={s.id}>{s.name} - {s.department}</option>)}
            </select>
          </div>
        </div>
        <form onSubmit={submit} className="row" style={{marginTop:10}}>
          <div className="col-3"><input className="input" placeholder="Subject Name" value={form.name} onChange={e=>setForm(v=>({...v, name:e.target.value}))}/></div>
          <div className="col-3"><input className="input" placeholder="Subject Code" value={form.subject_code} onChange={e=>setForm(v=>({...v, subject_code:e.target.value}))}/></div>
          <div className="col-2"><input className="input" placeholder="Credits" value={form.credits} onChange={e=>setForm(v=>({...v, credits:e.target.value}))}/></div>
          <div className="col-2"><input className="input" placeholder="Sem" value={form.semester} onChange={e=>setForm(v=>({...v, semester:e.target.value}))}/></div>
          <div className="col-12" style={{marginTop:8}}><input className="input" placeholder="Description" value={form.description} onChange={e=>setForm(v=>({...v, description:e.target.value}))}/></div>
          <div className="col-12" style={{marginTop:8}}><button className="btn" disabled={loading}>{loading?'Saving...':'+ Add Subject'}</button></div>
        </form>
      </div>
      <div className="grid">
        {items.map(s=> (
          <div key={s.id} className="tile" onClick={()=> onSelectSubject(s)} style={{cursor:'pointer'}}>
            <div className="title">{s.name}</div>
            <div className="subtitle">{s.subject_code || '—'} | Credits: {s.credits || '—'} | Sem: {s.semester || '—'}</div>
            <div style={{fontSize:14}}>{s.description}</div>
            <div style={{marginTop:8}}><button className="btn secondary" onClick={(e)=>{e.stopPropagation(); onSelectSubject(s)}}>Manage Notes</button></div>
          </div>
        ))}
      </div>

      {selectedSubject && (
        <div className="card" style={{marginTop:16}}>
          <div className="h2">Notes for: {selectedSubject.name} ({selectedSubject.subject_code || '—'})</div>
          <div className="row" style={{marginTop:8}}>
            <div className="col-12" style={{marginBottom:8}}>
              <div className="subtitle" style={{marginBottom:6}}>Syllabus</div>
              {syllabus.length > 0 ? (
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <span>{syllabus[0].original_filename || 'syllabus.pdf'}</span>
                  <button className="btn" onClick={()=> previewSyllabus(syllabus[0].id)} disabled={opBusy}>Preview</button>
                  <button className="btn secondary" onClick={()=> deleteSyllabus(syllabus[0].id)} disabled={opBusy}>Delete</button>
                </div>
              ) : (
                <label className="btn" style={{display:'inline-block'}}>
                  Upload Syllabus
                  <input type="file" accept="application/pdf" style={{display:'none'}} onChange={e=> uploadSyllabus(e.target.files?.[0])}/>
                </label>
              )}
            </div>
            {[1,2,3,4,5].map(m=>{
              const file = modules.find(x=> Number(x.module) === m)
              return (
                <div key={m} className="col-12" style={{marginBottom:8}}>
                  <div className="subtitle" style={{marginBottom:6}}>Module {m}</div>
                  {file ? (
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span>{file.original_filename || `module_${m}.pdf`}</span>
                      <button className="btn" onClick={()=> previewModule(file.id)} disabled={opBusy}>Preview</button>
                      <button className="btn secondary" onClick={()=> deleteModule(file.id)} disabled={opBusy}>Delete</button>
                    </div>
                  ) : (
                    <label className="btn" style={{display:'inline-block'}}>
                      Upload Module {m}
                      <input type="file" accept="application/pdf" style={{display:'none'}} onChange={e=> uploadModule(m, e.target.files?.[0])}/>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
