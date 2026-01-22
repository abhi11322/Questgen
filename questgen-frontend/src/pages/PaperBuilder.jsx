import React, { useEffect, useMemo, useState } from 'react'
import { SchemesAPI, SubjectsAPI, PaperAPI } from '../services/api'

const defaultHeader = {
  collegeName: 'Gopalan College of Engineering and Management',
  logoUrl: '/college-logo.png',
  website: 'www.gopalancolleges.com',
  phone: '080-4952 0244',
  email: 'gcem@gopalancolleges.com',
  address: '181/1, Seetharampalya, Hoodi, K.R. Puram, Whitefield, Bangalore, Karnataka - 560048',
  testName: 'INTERNAL ASSESSMENT TEST - 1', academicYear: '', program: '', dept: '', schemeName: '',
  yearSemSec: '', date: '', courseTitle: '', courseCode: '', time: '', session: '', credits: '',
  duration: '', maxMarks: '', approvedBy: '(HOD - dept)', principal: 'PRINCIPAL', preparedBy: ''
}

export default function PaperBuilder(){
  const [schemes, setSchemes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [schemeId, setSchemeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [header, setHeader] = useState(defaultHeader)

  // config
  const [title, setTitle] = useState('INTERNAL ASSESSMENT TEST - 1')
  const [numQuestions, setNumQuestions] = useState('6')
  const [partsGlobal, setPartsGlobal] = useState('a,b')
  const [marksGlobal, setMarksGlobal] = useState('10,10')
  const [perQParts, setPerQParts] = useState('') // e.g., "a,b; a,b; a,b"
  const [perQMarks, setPerQMarks] = useState('')
  const [orAfter, setOrAfter] = useState('2,5')
  const [bestEffort, setBestEffort] = useState(true)
  const [modulePerc, setModulePerc] = useState({1:'20',2:'20',3:'20',4:'20',5:'20'})
  const [rbtPerc, setRbtPerc] = useState({L1:'20',L2:'20',L3:'20',L4:'20',L5:'20',L6:'0'})

  const [draftId, setDraftId] = useState('')
  const [rows, setRows] = useState([])
  const [coTable, setCoTable] = useState([]) // array of {co,text}
  const [rbtTable, setRbtTable] = useState({})

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadSchemes = async ()=>{
    try{ const data = await SchemesAPI.list(); setSchemes(data); if(data[0]) setSchemeId(String(data[0].id)) }catch(e){ setError(e.message) }
  }
  const loadSubjects = async (sid)=>{
    if(!sid){ setSubjects([]); setSubjectId(''); return }
    try{ const data = await SubjectsAPI.list(Number(sid)); setSubjects(data); if(data[0]) setSubjectId(String(data[0].id)) }catch(e){ setError(e.message) }
  }
  useEffect(()=>{ loadSchemes() }, [])
  useEffect(()=>{ loadSubjects(schemeId) }, [schemeId])

  const buildQuestionsConfig = ()=>{
    const n = parseInt(numQuestions || '0', 10) || 0
    const parts = (partsGlobal || '').split(',').map(s=>s.trim()).filter(Boolean)
    const marks = (marksGlobal || '').split(',').map(s=>s.trim()).filter(Boolean)
    const perPartsList = perQParts.trim() ? perQParts.split(';').map(x=>x.split(',').map(s=>s.trim())) : []
    const perMarksList = perQMarks.trim() ? perQMarks.split(';').map(x=>x.split(',').map(s=>s.trim())) : []
    const qs = []
    for(let i=1;i<=n;i++){
      const p = (perPartsList[i-1] && perPartsList[i-1].length) ? perPartsList[i-1] : parts
      const mlist = (perMarksList[i-1] && perMarksList[i-1].length) ? perMarksList[i-1] : marks
      const marksMap = {}
      p.forEach((label, idx)=>{ marksMap[label] = parseInt(mlist[idx] || mlist[0] || '0', 10) || 0 })
      qs.push({ qno: i, parts: p, marks: marksMap })
    }
    return qs
  }

  const onGenerate = async ()=>{
    setError(''); setNotice('')
    if(!(schemeId && subjectId)) { setError('Select scheme and subject'); return }
    try{
      setBusy(true)
      const config = {
        scheme_id: Number(schemeId), subject_id: Number(subjectId), title,
        header,
        questions: buildQuestionsConfig(),
        or_between: (orAfter||'').split(',').map(s=>parseInt(s.trim(),10)).filter(Boolean).map(n=>({after_qno:n})),
        rbt_enabled: true,
        module_percentages: Object.fromEntries(Object.entries(modulePerc).map(([k,v])=>[k, parseInt(v||'0',10)||0])),
        rbt_percentages: Object.fromEntries(Object.entries(rbtPerc).map(([k,v])=>[k, parseInt(v||'0',10)||0])),
        best_effort: !!bestEffort,
      }
      const res = await PaperAPI.generate(config)
      setRows(res.paper?.rows || [])
      setTitle(res.paper?.title || title)
      setDraftId(String(res.draft_id || ''))
      setNotice(`Draft created with ID: ${res.draft_id}`)
    }catch(e){ setError(e.message) } finally{ setBusy(false) }
  }

  const onLoad = async ()=>{
    setError(''); setNotice('')
    const id = parseInt(draftId||'0',10)
    if(!id){ setError('Enter a Draft ID to load'); return }
    try{
      setBusy(true)
      const d = await PaperAPI.draft(id)
      setTitle(d.title || title)
      setHeader(d.header || header)
      setRows(d.rows || [])
      setCoTable(d.co_table || [])
      setRbtTable(d.rbt_table || {})
      setNotice(`Loaded Draft #${id}`)
    }catch(e){ setError(e.message) } finally{ setBusy(false) }
  }

  const onSave = async ()=>{
    setError(''); setNotice('')
    const id = parseInt(draftId||'0',10)
    if(!id){ setError('No draft ID. Generate first or enter an ID to save.'); return }
    try{
      setBusy(true)
      await PaperAPI.save(id, { title, header, rows, co_table: coTable, rbt_table: rbtTable })
      setNotice('Saved')
    }catch(e){ setError(e.message) } finally{ setBusy(false) }
  }

  const onExport = async ()=>{
    setError(''); setNotice('')
    const id = parseInt(draftId||'0',10)
    if(!id){ setError('No draft ID. Generate first or load a draft.'); return }
    try{
      setBusy(true)
      // Ensure logo is embedded or absolute for backend export
      let exportHeader = { ...header }
      try{
        const src = exportHeader.logoUrl
        if (src) {
          const isData = String(src).trim().toLowerCase().startsWith('data:')
          const isHttp = /^https?:\/\//i.test(String(src))
          // Build absolute URL for relative paths
          const absolute = isHttp ? src : `${window.location.origin}${String(src).startsWith('/') ? '' : '/'}${src}`
          if (!isData) {
            const resp = await fetch(absolute)
            const blob = await resp.blob()
            const dataUrl = await new Promise((resolve)=>{
              const reader = new FileReader()
              reader.onloadend = ()=> resolve(reader.result)
              reader.readAsDataURL(blob)
            })
            exportHeader.logoUrl = String(dataUrl || absolute)
          }
        }
      }catch{ /* non-fatal: fall back to original header */ }
      const blobRes = await PaperAPI.exportHtml(id, { title, header: exportHeader, rows, co_table: coTable, rbt_table: rbtTable })
      const url = URL.createObjectURL(blobRes.data)
      const a = document.createElement('a')
      a.href = url; a.download = `paper_${id}.html`; a.click()
      URL.revokeObjectURL(url)
      setNotice('Exported HTML')
    }catch(e){ setError(e.message) } finally{ setBusy(false) }
  }

  const updateRowPart = (qi, pi, field, value)=>{
    setRows(prev => prev.map((r, ri)=>{
      if(r.type === 'or') return r
      if(ri !== qi) return r
      const parts = (r.parts || []).map((p, pj)=> pj===pi ? {...p, [field]: value } : p)
      return { ...r, parts }
    }))
  }

  return (
    <div className="container">
      <h1 className="h1">Paper Builder</h1>
      {error && <div className="error" style={{marginBottom:10}}>{error}</div>}
      {notice && <div className="card" style={{marginBottom:10, border:'1px solid #d1fae5', background:'#ecfdf5', color:'#065f46'}}>{notice}</div>}

      {/* Header editable block */}
      <div className="card" style={{marginBottom:16}}>
        <div className="h2">Header (Editable)</div>
        <div className="row">
          <div className="col-6"><input className="input" placeholder="College Name" value={header.collegeName} onChange={e=>setHeader({...header, collegeName:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Logo URL" value={header.logoUrl} onChange={e=>setHeader({...header, logoUrl:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Phone" value={header.phone} onChange={e=>setHeader({...header, phone:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Email" value={header.email} onChange={e=>setHeader({...header, email:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Website" value={header.website} onChange={e=>setHeader({...header, website:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Address" value={header.address} onChange={e=>setHeader({...header, address:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Test Name" value={header.testName} onChange={e=>setHeader({...header, testName:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Academic Year" value={header.academicYear} onChange={e=>setHeader({...header, academicYear:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Scheme" value={header.schemeName} onChange={e=>setHeader({...header, schemeName:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Program" value={header.program} onChange={e=>setHeader({...header, program:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Dept." value={header.dept} onChange={e=>setHeader({...header, dept:e.target.value})} /></div>
          <div className="col-4"><input className="input" placeholder="Year/Sem/Section" value={header.yearSemSec} onChange={e=>setHeader({...header, yearSemSec:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Date" value={header.date} onChange={e=>setHeader({...header, date:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Course Title" value={header.courseTitle} onChange={e=>setHeader({...header, courseTitle:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Course Code" value={header.courseCode} onChange={e=>setHeader({...header, courseCode:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Credits" value={header.credits} onChange={e=>setHeader({...header, credits:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Time" value={header.time} onChange={e=>setHeader({...header, time:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Session" value={header.session} onChange={e=>setHeader({...header, session:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Duration" value={header.duration} onChange={e=>setHeader({...header, duration:e.target.value})} /></div>
          <div className="col-3"><input className="input" placeholder="Max Marks" value={header.maxMarks} onChange={e=>setHeader({...header, maxMarks:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Approved By (HOD - dept)" value={header.approvedBy} onChange={e=>setHeader({...header, approvedBy:e.target.value})} /></div>
          <div className="col-6"><input className="input" placeholder="Prepared By (name/designation)" value={header.preparedBy} onChange={e=>setHeader({...header, preparedBy:e.target.value})} /></div>
        </div>
        <div className="subtitle" style={{marginTop:8}}>These fields will appear in the exported paper header and are saved with the draft.</div>
      </div>

      {/* Configuration */}
      <div className="card" style={{marginBottom:16}}>
        <div className="h2">Configuration</div>
        <div className="row">
          <div className="col-3">
            <label style={{fontSize:12, color:'var(--muted)'}}>Scheme</label>
            <select className="input" value={schemeId} onChange={e=>setSchemeId(e.target.value)}>
              {schemes.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
            </select>
          </div>
          <div className="col-4">
            <label style={{fontSize:12, color:'var(--muted)'}}>Subject</label>
            <select className="input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
              {subjects.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.subject_code || ''})</option>)}
            </select>
          </div>
          <div className="col-3"><label style={{fontSize:12, color:'var(--muted)'}}>Title</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Paper Title"/></div>
          <div className="col-2"><label style={{fontSize:12, color:'var(--muted)'}}># Questions</label><input className="input" value={numQuestions} onChange={e=>setNumQuestions(e.target.value)} /></div>
          <div className="col-3"><label style={{fontSize:12, color:'var(--muted)'}}>Parts (comma)</label><input className="input" value={partsGlobal} onChange={e=>setPartsGlobal(e.target.value)} placeholder="a,b"/></div>
          <div className="col-3"><label style={{fontSize:12, color:'var(--muted)'}}>Marks per Part (comma)</label><input className="input" value={marksGlobal} onChange={e=>setMarksGlobal(e.target.value)} placeholder="10,10"/></div>
          <div className="col-6"><label style={{fontSize:12, color:'var(--muted)'}}>Per-question Parts (use ; between questions)</label><input className="input" value={perQParts} onChange={e=>setPerQParts(e.target.value)} placeholder="a,b; a,b"/></div>
          <div className="col-6"><label style={{fontSize:12, color:'var(--muted)'}}>Per-question Marks (use ; between questions)</label><input className="input" value={perQMarks} onChange={e=>setPerQMarks(e.target.value)} placeholder="10,10; 10,10"/></div>
          <div className="col-4"><label style={{fontSize:12, color:'var(--muted)'}}>OR after (comma)</label><input className="input" value={orAfter} onChange={e=>setOrAfter(e.target.value)} placeholder="2,5"/></div>
          <div className="col-4" style={{display:'flex', alignItems:'flex-end', gap:8}}>
            <input id="bestEff" type="checkbox" checked={bestEffort} onChange={e=>setBestEffort(e.target.checked)} />
            <label htmlFor="bestEff" style={{color:'var(--muted)'}}>Best-effort (relax constraints to avoid blanks)</label>
          </div>
          <div className="col-4" style={{display:'flex', alignItems:'flex-end'}}>
            <button className="btn" onClick={onGenerate} disabled={busy}>{busy? 'Generating...' : 'Generate Draft'}</button>
          </div>
        </div>

        {/* Module distribution */}
        <div className="row" style={{marginTop:10}}>
          {[1,2,3,4,5].map(m=> (
            <div key={m} className="col-2"><label style={{fontSize:12, color:'var(--muted)'}}>Module {m} (%)</label><input className="input" value={modulePerc[m]} onChange={e=>setModulePerc(v=>({...v, [m]: e.target.value}))} /></div>
          ))}
        </div>
        {/* RBT distribution */}
        <div className="row" style={{marginTop:10}}>
          {['L1','L2','L3','L4','L5','L6'].map(k=> (
            <div key={k} className="col-2"><label style={{fontSize:12, color:'var(--muted)'}}>{k} (%)</label><input className="input" value={rbtPerc[k]} onChange={e=>setRbtPerc(v=>({...v, [k]: e.target.value}))} /></div>
          ))}
        </div>

        {/* Draft controls */}
        <div className="row" style={{marginTop:12, alignItems:'center'}}>
          <div className="col-2"><input className="input" placeholder="Load Draft ID" value={draftId} onChange={e=>setDraftId(e.target.value)} /></div>
          <div className="col-1"><button className="btn secondary" onClick={onLoad} disabled={busy}>Load</button></div>
          <div className="col-1"><button className="btn" onClick={onSave} disabled={busy || !draftId}>Save</button></div>
          <div className="col-2"><button className="btn" onClick={onExport} disabled={busy || !draftId}>Export HTML</button></div>
        </div>
      </div>

      {/* Render rows */}
      {rows && rows.length > 0 && (
        <div className="card" style={{overflowX:'auto'}}>
          <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
            <div className="h2" style={{margin:0}}>{title}</div>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', border:'1px solid var(--border)', padding:8, width:70}}>Q. No.</th>
                <th style={{textAlign:'left', border:'1px solid var(--border)', padding:8}}>Questions</th>
                <th style={{textAlign:'left', border:'1px solid var(--border)', padding:8, width:90}}>Marks</th>
                <th style={{textAlign:'left', border:'1px solid var(--border)', padding:8, width:100}}>CO</th>
                <th style={{textAlign:'left', border:'1px solid var(--border)', padding:8, width:100}}>RBT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri)=>{
                if(r.type === 'or') return (
                  <tr key={`or-${ri}`}><td colSpan={5} style={{textAlign:'center', fontWeight:700, border:'1px solid var(--border)', padding:8}}>OR</td></tr>
                )
                const total = (r.parts||[]).reduce((a,b)=> a + (parseInt(b.marks||0,10)||0), 0)
                return (
                  <tr key={ri}>
                    <td style={{border:'1px solid var(--border)', padding:8}}>{r.qno}</td>
                    <td style={{border:'1px solid var(--border)', padding:0}}>
                      <div style={{padding:6}}>
                        {(r.parts||[]).map((p, pi)=> (
                          <div key={pi} style={{display:'grid', gridTemplateColumns:'auto 1fr 90px 90px', alignItems:'center', gap:6, margin:'6px 0'}}>
                            <b>{p.label})</b>
                            <input className="input" style={{width:'100%'}} value={p.text||''} onChange={e=>updateRowPart(ri, pi, 'text', e.target.value)} />
                            <input className="input" type="number" min="0" placeholder="Marks" value={p.marks??''} onChange={e=>updateRowPart(ri, pi, 'marks', e.target.value? parseInt(e.target.value,10): 0)} />
                            <input className="input" placeholder="RBT (e.g., L1)" value={p.rbt||''} onChange={e=>updateRowPart(ri, pi, 'rbt', e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{border:'1px solid var(--border)', padding:8}}>{total}</td>
                    <td style={{border:'1px solid var(--border)', padding:8}}>{(r.parts||[]).map(p=> (p.co||[]).join(',')).filter(Boolean).join(' | ')}</td>
                    <td style={{border:'1px solid var(--border)', padding:8}}>{(r.parts||[]).map(p=> p.rbt||'').filter(Boolean).join(' | ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CO table editor */}
      <div className="card" style={{marginTop:12}}>
        <div className="h2">Course Outcomes (COs)</div>
        <div className="row" style={{fontWeight:700, marginBottom:6}}>
          <div className="col-2">CO No.</div>
          <div className="col-9">At the end of the course, students will be able to...</div>
          <div className="col-1">Actions</div>
        </div>
        {(coTable || []).map((row, idx)=> (
          <div key={idx} className="row" style={{alignItems:'center', marginBottom:6}}>
            <div className="col-2"><input className="input" value={row.co||''} onChange={e=>setCoTable(t=> t.map((r,i)=> i===idx?{...r, co:e.target.value}:r))} placeholder="CO1"/></div>
            <div className="col-9"><input className="input" value={row.text||''} onChange={e=>setCoTable(t=> t.map((r,i)=> i===idx?{...r, text:e.target.value}:r))} placeholder="Outcome statement"/></div>
            <div className="col-1"><button className="btn secondary" onClick={()=>setCoTable(t=> t.filter((_,i)=> i!==idx))}>Remove</button></div>
          </div>
        ))}
        <button className="btn" onClick={()=> setCoTable(t=> [...(t||[]), {co:`CO${(t?.length||0)+1}`, text:''}])}>+ Add CO</button>
      </div>

      {/* RBT footer editor */}
      <div className="card" style={{marginTop:12}}>
        <div className="h2">Revised Bloom's Taxonomy (RBT) Levels</div>
        <div className="row" style={{gap:12}}>
          {['L1','L2','L3','L4','L5','L6'].map(k=> (
            <div key={k} className="col-2">
              <label style={{fontSize:12, color:'var(--muted)'}}>{k}</label>
              <input className="input" placeholder="Description" value={rbtTable?.[k]||''} onChange={e=> setRbtTable(t=> ({...t, [k]: e.target.value}))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
