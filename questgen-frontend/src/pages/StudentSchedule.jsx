import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { TasksAPI } from '../services/api'

const priorities = ['LOW','MEDIUM','HIGH']

export default function StudentSchedule(){
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all|today|week
  const [form, setForm] = useState({ title:'', description:'', due_date:'', due_time:'', priority:'MEDIUM' })
  const [editing, setEditing] = useState(null) // id being edited

  const load = async () => {
    if(!user?.id) return
    setLoading(true); setError('')
    try {
      const data = await TasksAPI.list(user.id, {})
      // Normalize dates
      setItems(Array.isArray(data)? data: [])
    } catch(e){ setError(e.message) } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [user?.id])

  const resetForm = ()=> setForm({ title:'', description:'', due_date:'', due_time:'', priority:'MEDIUM' })

  const toISO = (dateStr, timeStr) => {
    if(!dateStr) return null
    const t = timeStr || '00:00'
    return new Date(`${dateStr}T${t}:00`).toISOString()
  }

  const onCreate = async (e)=>{
    e.preventDefault(); setError('')
    if(!form.title){ setError('Title is required'); return }
    try{
      await TasksAPI.create({
        student_id: user.id,
        title: form.title,
        description: form.description || undefined,
        due_at: toISO(form.due_date, form.due_time),
        priority: form.priority,
        completed: false,
      })
      resetForm(); await load()
    }catch(e){ setError(e.message) }
  }

  const onUpdate = async (id, patch) => {
    try{ await TasksAPI.update(id, patch); await load() }catch(e){ setError(e.message) }
  }
  const onDelete = async (id) => {
    if(!confirm('Delete this task?')) return
    try{ await TasksAPI.delete(id); await load() }catch(e){ setError(e.message) }
  }

  const toggleComplete = (task) => onUpdate(task.id, { completed: !task.completed })

  const startEdit = (task) => {
    setEditing(task.id)
    const dt = task.due_at ? new Date(task.due_at) : null
    setForm({
      title: task.title || '',
      description: task.description || '',
      due_date: dt? dt.toISOString().slice(0,10): '',
      due_time: dt? dt.toTimeString().slice(0,5): '',
      priority: task.priority || 'MEDIUM',
    })
  }
  const saveEdit = async (e) => {
    e.preventDefault(); if(!editing) return
    await onUpdate(editing, {
      title: form.title,
      description: form.description || undefined,
      due_at: toISO(form.due_date, form.due_time),
      priority: form.priority,
    })
    setEditing(null); resetForm()
  }
  const cancelEdit = ()=> { setEditing(null); resetForm() }

  // filtering helpers
  const filtered = useMemo(()=>{
    if(filter==='all') return items
    const now = new Date()
    if(filter==='today'){
      return items.filter(t=>{
        if(!t.due_at) return false
        const d = new Date(t.due_at)
        return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate()
      })
    }
    if(filter==='week'){
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()) // Sunday
      const end = new Date(start); end.setDate(start.getDate()+7)
      return items.filter(t=>{
        if(!t.due_at) return false
        const d = new Date(t.due_at)
        return d>=start && d<end
      })
    }
    return items
  }, [items, filter])

  const pending = filtered.filter(t=> !t.completed)
  const completed = filtered.filter(t=> !!t.completed)

  return (
    <div className="container">
      <h1 className="h1">My Schedule / Tasks</h1>
      <p className="subtitle">Plan your study with a simple to-do list. Create tasks, set due dates, and track progress.</p>
      {error && <div className="error" style={{marginBottom:8}}>{error}</div>}

      <div className="card" style={{marginBottom:16}}>
        <div className="row" style={{alignItems:'flex-end', gap:8}}>
          <div className="col-3"><input className="input" placeholder="Title" value={form.title} onChange={e=>setForm(v=>({...v, title:e.target.value}))} /></div>
          <div className="col-4"><input className="input" placeholder="Description (optional)" value={form.description} onChange={e=>setForm(v=>({...v, description:e.target.value}))} /></div>
          <div className="col-2"><input className="input" type="date" value={form.due_date} onChange={e=>setForm(v=>({...v, due_date:e.target.value}))} /></div>
          <div className="col-1"><input className="input" type="time" value={form.due_time} onChange={e=>setForm(v=>({...v, due_time:e.target.value}))} /></div>
          <div className="col-2">
            <select className="input" value={form.priority} onChange={e=>setForm(v=>({...v, priority:e.target.value}))}>
              {priorities.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-12" style={{marginTop:8}}>
            {editing? (
              <div style={{display:'flex', gap:8}}>
                <button className="btn" onClick={saveEdit}>Save</button>
                <button className="btn secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button className="btn" onClick={onCreate} disabled={loading}>{loading? 'Saving...' : '+ Add Task'}</button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div className="subtitle" style={{margin:0}}>Filter:</div>
          <div style={{display:'flex', gap:6}}>
            {['all','today','week'].map(f=> (
              <button key={f} className={`btn ${filter===f? '' : 'secondary'}`} onClick={()=> setFilter(f)}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-6">
          <div className="h2">Pending</div>
          <div className="card">
            {pending.length===0 && <div className="subtitle">No pending tasks</div>}
            {pending.map(t=> (
              <div key={t.id} style={{display:'grid', gridTemplateColumns:'24px 1fr auto', gap:8, alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
                <input type="checkbox" checked={!!t.completed} onChange={()=> toggleComplete(t)} />
                <div>
                  <div style={{fontWeight:600}}>{t.title}</div>
                  <div style={{fontSize:13, color:'var(--muted)'}}>
                    {t.description}
                    {t.due_at && ` • Due: ${new Date(t.due_at).toLocaleString()}`}
                    {t.priority && ` • ${t.priority}`}
                  </div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  <button className="btn secondary" onClick={()=> startEdit(t)}>Edit</button>
                  <button className="btn secondary" onClick={()=> onDelete(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-6">
          <div className="h2">Completed</div>
          <div className="card">
            {completed.length===0 && <div className="subtitle">No completed tasks yet</div>}
            {completed.map(t=> (
              <div key={t.id} style={{display:'grid', gridTemplateColumns:'24px 1fr auto', gap:8, alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
                <input type="checkbox" checked={!!t.completed} onChange={()=> toggleComplete(t)} />
                <div>
                  <div style={{textDecoration:'line-through'}}>{t.title}</div>
                  <div style={{fontSize:13, color:'var(--muted)'}}>
                    {t.description}
                    {t.due_at && ` • Due: ${new Date(t.due_at).toLocaleString()}`}
                    {t.priority && ` • ${t.priority}`}
                  </div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  <button className="btn secondary" onClick={()=> startEdit(t)}>Edit</button>
                  <button className="btn secondary" onClick={()=> onDelete(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
