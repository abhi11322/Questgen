import React, { useEffect, useState } from 'react'
import { SchemesAPI } from '../services/api'

export default function Schemes(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name:'', department:'', description:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async ()=>{
    setLoading(true); setError('')
    try{ const data = await SchemesAPI.list(); setItems(data) }catch(e){ setError(e.message) }finally{ setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  const submit = async (e)=>{
    e.preventDefault(); setError('')
    if(!form.name || !form.department){ setError('Name and Department are required'); return }
    try{ await SchemesAPI.create(form); setForm({name:'',department:'',description:''}); load() }catch(e){ setError(e.message) }
  }

  return (
    <div className="container">
      <h1 className="h1">Scheme Management</h1>
      <p className="subtitle">Create and manage academic schemes for your institution</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="card" style={{marginBottom:16, display:'grid', gap:10}}>
        <input className="input" placeholder="Scheme Name" value={form.name} onChange={e=>setForm(v=>({...v, name:e.target.value}))} />
        <input className="input" placeholder="Department Name" value={form.department} onChange={e=>setForm(v=>({...v, department:e.target.value}))} />
        <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm(v=>({...v, description:e.target.value}))} />
        <button className="btn" disabled={loading}>{loading?'Saving...':'+ Add Scheme'}</button>
      </form>
      <div className="grid">
        {items.map(s=> (
          <div key={s.id} className="tile">
            <div className="title">{s.name}</div>
            <div className="subtitle">{s.department}</div>
            <div style={{fontSize:14}}>{s.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
