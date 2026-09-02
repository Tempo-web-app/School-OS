'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronRight, Clock3, FileText, GraduationCap, LayoutDashboard, Languages, ListTodo, LogOut, Menu, NotebookPen, Plus, Search, Settings, Sparkles, Target, Timer, Trash2, X } from 'lucide-react'
import { getSupabaseClient } from '../lib/supabase'
import type { Assignment, Exam, Subject } from '../lib/types'

type View = 'dashboard' | 'assignments' | 'calendar' | 'notes' | 'study' | 'language' | 'grades' | 'tempo' | 'settings'

const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'assignments', label: 'Assignments', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays }, { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'study', label: 'Study Room', icon: Timer }, { id: 'language', label: 'Language', icon: Languages },
  { id: 'grades', label: 'Grades', icon: GraduationCap }, { id: 'tempo', label: 'Tempo', icon: Sparkles },
]

export default function Home() {
  const [view, setView] = useState<View>('dashboard')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sidebar, setSidebar] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = useMemo(() => getSupabaseClient(), [])
  const pending = assignments.filter(a => !['completed', 'cancelled'].includes(a.status))
  const completed = assignments.filter(a => a.status === 'completed')
  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? 'General'

  async function loadData() {
    try {
      setLoading(true); setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserEmail(user.email ?? '')
      const [a, e, s] = await Promise.all([
        supabase.from('assignments').select('*').eq('user_id', user.id).order('deadline', { ascending: true }).limit(100),
        supabase.from('exams').select('*').eq('user_id', user.id).order('exam_at', { ascending: true }).limit(100),
        supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
      ])
      const firstError = a.error || e.error || s.error
      if (firstError) throw firstError
      setAssignments(a.data ?? []); setExams(e.data ?? []); setSubjects(s.data ?? [])
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load School OS data') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function addAssignment() {
    if (!newTitle.trim()) return
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Please sign in first.')
      const { error } = await supabase.from('assignments').insert({ user_id: user.id, title: newTitle.trim(), deadline: newDeadline || null, subject_id: newSubject || null, status: 'todo', priority: 2 })
      if (error) throw error
      setNewTitle(''); setNewDeadline(''); setNewSubject(''); setShowAdd(false); await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create assignment') }
    finally { setSaving(false) }
  }

  async function toggleAssignment(a: Assignment) {
    const next = a.status === 'completed' ? 'todo' : 'completed'
    const { error } = await supabase.from('assignments').update({ status: next }).eq('id', a.id)
    if (error) setError(error.message); else setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x))
  }

  async function deleteAssignment(id: string) {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) setError(error.message); else setAssignments(prev => prev.filter(x => x.id !== id))
  }

  async function signOut() { await supabase.auth.signOut(); window.location.reload() }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? '' : 'collapsed'}`}>
      <div className="brand"><div className="brand-mark">S</div>{sidebar && <div><strong>School OS</strong><span>Powered by Tempo</span></div>}</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.id)}><Icon size={18}/>{sidebar && item.label}</button> })}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setView('settings')}><Settings size={18}/>{sidebar && 'Settings'}</button><button className="nav-item" onClick={signOut}><LogOut size={18}/>{sidebar && 'Sign out'}</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn" onClick={() => setSidebar(!sidebar)}><Menu size={19}/></button><div className="search"><Search size={16}/><input placeholder="Search School OS..." /></div><div className="profile"><div className="avatar">{userEmail ? userEmail[0].toUpperCase() : 'S'}</div><span>{userEmail || 'Student'}</span></div></header>
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      <div className="content">
        {view === 'dashboard' && <Dashboard pending={pending} completed={completed} exams={exams} subjects={subjects} subjectName={subjectName} loading={loading} onAdd={() => setShowAdd(true)} onToggle={toggleAssignment} onView={setView}/>} 
        {view === 'assignments' && <Assignments assignments={assignments} subjectName={subjectName} onAdd={() => setShowAdd(true)} onToggle={toggleAssignment} onDelete={deleteAssignment}/>} 
        {view === 'calendar' && <Calendar assignments={assignments} exams={exams} subjectName={subjectName}/>} 
        {view === 'notes' && <Placeholder icon={NotebookPen} title="Notes" text="Your notes workspace is ready for rich text, folders, tags, attachments and autosave." button="Create note"/>}
        {view === 'study' && <StudyRoom/>}
        {view === 'language' && <Placeholder icon={Languages} title="Language Center" text="Vocabulary, grammar, reading, writing, listening and speaking will live here." button="Start a session"/>}
        {view === 'grades' && <Placeholder icon={GraduationCap} title="Grades" text="Track subject performance, averages, trends and target grades." button="Add grade"/>}
        {view === 'tempo' && <Tempo pending={pending}/>} 
        {view === 'settings' && <Placeholder icon={Settings} title="Settings" text="Account, appearance, subjects, notifications and School OS preferences." button="Preferences"/>}
      </div>
    </main>
    {showAdd && <Modal title="New assignment" onClose={() => setShowAdd(false)}><input autoFocus className="field" placeholder="Assignment title" value={newTitle} onChange={e => setNewTitle(e.target.value)}/><input className="field" type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}/><select className="field" value={newSubject} onChange={e => setNewSubject(e.target.value)}><option value="">No subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="primary full" onClick={addAssignment} disabled={saving}>{saving ? 'Saving...' : 'Create assignment'}</button></Modal>}
  </div>
}

function Dashboard({ pending, completed, exams, subjects, subjectName, loading, onAdd, onToggle, onView }: any) { return <>
  <div className="page-head"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</div><h1>Good afternoon.</h1><p>Here’s what needs your attention today.</p></div><button className="primary" onClick={onAdd}><Plus size={17}/> New assignment</button></div>
  <section className="stats"><Stat icon={ListTodo} label="Pending" value={pending.length} hint="assignments"/><Stat icon={Target} label="Completed" value={completed.length} hint="all time"/><Stat icon={GraduationCap} label="Exams" value={exams.length} hint="upcoming"/><Stat icon={Sparkles} label="Tempo" value="Ready" hint="planning engine"/></section>
  <div className="grid-two"><Panel title="Priority queue" action="View all" onAction={() => onView('assignments')}><TaskList items={pending.slice(0,6)} subjectName={subjectName} onToggle={onToggle} loading={loading}/></Panel><Panel title="Upcoming exams"><div className="exam-list">{exams.slice(0,5).map((e: Exam) => <div className="exam" key={e.id}><div className="date-box">{new Date(e.exam_at).getDate()}<small>{new Date(e.exam_at).toLocaleDateString(undefined,{month:'short'})}</small></div><div><strong>{e.title}</strong><span>{subjectName(e.subject_id)} · {new Date(e.exam_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span></div></div>)}{!exams.length && <Empty text="No exams scheduled."/>}</div></Panel></div>
  <Panel title="Your subjects"><div className="subject-grid">{subjects.map((s: Subject) => <div className="subject" key={s.id}><div className="subject-dot" style={{background:s.color || '#888'}}/><div><strong>{s.name}</strong><span>{pending.filter((a: Assignment)=>a.subject_id===s.id).length} pending</span></div><ChevronRight size={16}/></div>)}{!subjects.length && <Empty text="Add subjects in your school setup."/>}</div></Panel>
</> }

function Assignments({ assignments, subjectName, onAdd, onToggle, onDelete }: any) { return <><div className="page-head"><div><div className="eyebrow">WORKLOAD</div><h1>Assignments</h1><p>Everything you need to finish, in one place.</p></div><button className="primary" onClick={onAdd}><Plus size={17}/> New assignment</button></div><Panel title={`${assignments.length} assignments`}><TaskList items={assignments} subjectName={subjectName} onToggle={onToggle} onDelete={onDelete}/></Panel></> }

function TaskList({items,subjectName,onToggle,onDelete,loading}:any){if(loading)return <div className="empty">Loading your work...</div>;if(!items.length)return <Empty text="Nothing here. Humanity survives another day."/>;return <div className="task-list">{items.map((a:Assignment)=><div className={`task ${a.status==='completed'?'done':''}`} key={a.id}><button className="check" onClick={()=>onToggle(a)}><Check size={14}/></button><div className="task-main"><strong>{a.title}</strong><span>{subjectName(a.subject_id)} · {a.deadline?new Date(a.deadline).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'No deadline'}</span></div><div className="priority">{a.priority>=3?'High':a.priority===2?'Normal':'Low'}</div>{onDelete&&<button className="ghost danger" onClick={()=>onDelete(a.id)}><Trash2 size={15}/></button>}</div>)}</div>}

function Calendar({assignments,exams,subjectName}:any){const days=Array.from({length:35},(_,i)=>{const d=new Date();d.setDate(1);const first=d.getDay();d.setDate(i-first+1);return d});return <><div className="page-head"><div><div className="eyebrow">SCHEDULE</div><h1>{new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h1><p>Assignments and exams, without the paper-planner archaeology.</p></div></div><div className="calendar"><div className="weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{days.map((d,i)=>{const key=d.toDateString();const as=assignments.filter((a:Assignment)=>a.deadline&&new Date(a.deadline).toDateString()===key);const es=exams.filter((e:Exam)=>new Date(e.exam_at).toDateString()===key);return <div className={`day ${d.getMonth()!==new Date().getMonth()?'muted':''}`} key={i}><b>{d.getDate()}</b>{as.slice(0,2).map((a:Assignment)=><div className="cal-item" key={a.id}>{a.title}</div>)}{es.slice(0,1).map((e:Exam)=><div className="cal-exam" key={e.id}>{e.title}</div>)}</div>})}</div></div></>}

function StudyRoom(){const [seconds,setSeconds]=useState(25*60);const [running,setRunning]=useState(false);useEffect(()=>{if(!running)return;const id=setInterval(()=>setSeconds(s=>s>0?s-1:0),1000);return()=>clearInterval(id)},[running]);const mins=String(Math.floor(seconds/60)).padStart(2,'0'),secs=String(seconds%60).padStart(2,'0');return <><div className="page-head"><div><div className="eyebrow">FOCUS</div><h1>Study Room</h1><p>One task. One timer. Fewer opportunities to invent excuses.</p></div></div><div className="focus-card"><div className="timer-ring"><span>{mins}:{secs}</span><small>FOCUS</small></div><div className="timer-controls"><button className="primary" onClick={()=>setRunning(!running)}>{running?'Pause':'Start focus'}</button><button className="secondary" onClick={()=>{setRunning(false);setSeconds(25*60)}}>Reset</button></div><div className="timer-meta"><span><Clock3 size={16}/> 25 min focus</span><span><Target size={16}/> Pomodoro</span></div></div></>}

function Tempo({pending}:any){return <><div className="page-head"><div><div className="eyebrow">INTELLIGENCE LAYER</div><h1>Tempo</h1><p>Your workload, turned into an actual plan.</p></div><button className="primary"><Sparkles size={17}/> Generate plan</button></div><div className="tempo-hero"><div><div className="tempo-logo">T</div><h2>{pending.length ? `You have ${pending.length} things to do.` : 'You are clear.'}</h2><p>Tempo will prioritize deadlines, difficulty and available study time, then build a schedule that can adapt when life inevitably does something stupid.</p></div><div className="tempo-stat"><strong>{pending.length}</strong><span>pending tasks</span></div></div><div className="grid-two"><Panel title="Planning pipeline"><Pipeline n="01" t="Collect workload" d="Assignments, exams and goals"/><Pipeline n="02" t="Prioritize" d="Deadline × difficulty × time"/><Pipeline n="03" t="Schedule" d="Fit work into available time"/><Pipeline n="04" t="Adapt" d="Reschedule missed sessions automatically"/></Panel><Panel title="Planning principles"><p className="muted-text">Tempo is not another to-do list. It is the layer that decides what deserves your attention next, while keeping your deadlines visible.</p></Panel></div></>}
function Pipeline({n,t,d}:{n:string,t:string,d:string}){return <div className="pipeline"><span>{n}</span><div><strong>{t}</strong><small>{d}</small></div><ChevronRight size={16}/></div>}
function Placeholder({icon:Icon,title,text,button}:{icon:any,title:string,text:string,button:string}){return <div className="placeholder"><div className="placeholder-icon"><Icon size={26}/></div><h1>{title}</h1><p>{text}</p><button className="primary"><Plus size={17}/>{button}</button></div>}
function Stat({icon:Icon,label,value,hint}:{icon:any,label:string,value:any,hint:string}){return <div className="stat"><div className="stat-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>}
function Panel({title,children,action,onAction}:{title:string;children:React.ReactNode;action?:string;onAction?:()=>void}){return <section className="panel"><div className="panel-head"><h3>{title}</h3>{action&&<button onClick={onAction}>{action}<ChevronRight size={15}/></button>}</div>{children}</section>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>}
