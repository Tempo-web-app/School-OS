'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import type { Assignment, Exam, Subject } from '../lib/types'

export default function Home() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (active) setLoading(false); return }
        const [a, e, s] = await Promise.all([
          supabase.from('assignments').select('*').eq('user_id', user.id).order('deadline', { ascending: true }).limit(8),
          supabase.from('exams').select('*').eq('user_id', user.id).order('exam_at', { ascending: true }).limit(5),
          supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
        ])
        const firstError = a.error || e.error || s.error
        if (firstError) throw firstError
        if (active) { setAssignments(a.data ?? []); setExams(e.data ?? []); setSubjects(s.data ?? []) }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Could not load School OS data') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])

  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? 'General'
  const pending = assignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled')

  return (
    <main style={{ minHeight: '100vh', padding: '32px', background: 'radial-gradient(circle at top right, #191919, #080808 45%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <div><div style={{ fontSize: 13, letterSpacing: 3, color: '#888', textTransform: 'uppercase' }}>School OS</div><h1 style={{ fontSize: 44, margin: '10px 0 0', letterSpacing: -2 }}>Your school life. One system.</h1></div>
          <div style={{ color: '#888', fontSize: 14 }}>Powered by Tempo</div>
        </header>
        {error && <div style={{ border: '1px solid #402020', background: '#180c0c', padding: 16, borderRadius: 14, marginBottom: 16, color: '#ffb4b4' }}>{error}</div>}
        <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card title="Today" large>{loading ? <div style={{ color: '#888', marginTop: 24 }}>Loading your school data…</div> : <><div style={{ marginTop: 22, fontSize: 32 }}>{pending.length} pending assignments</div><div style={{ color: '#777', marginTop: 6 }}>{exams.length} upcoming exams loaded</div></>}</Card>
          <Card title="Tempo"><div style={{ fontSize: 28, marginTop: 18 }}>{pending.length ? 'Plan ready' : 'Ready'}</div><div style={{ color: '#888', marginTop: 6 }}>Your planning engine will use your real assignments.</div></Card>
          <Card title="Subjects"><div style={{ fontSize: 28, marginTop: 18 }}>{subjects.length}</div><div style={{ color: '#888', marginTop: 6 }}>Subjects in your account</div></Card>
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <Card title="Upcoming assignments"><div style={{ marginTop: 14 }}>{pending.length === 0 && !loading ? <Empty text="No assignments yet." /> : pending.slice(0, 6).map(a => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #1c1c1c' }}><div><div>{a.title}</div><div style={{ color: '#777', fontSize: 13, marginTop: 4 }}>{subjectName(a.subject_id)}</div></div><div style={{ color: '#999', fontSize: 13 }}>{a.deadline ? new Date(a.deadline).toLocaleDateString() : 'No deadline'}</div></div>)}</div></Card>
          <Card title="Upcoming exams"><div style={{ marginTop: 14 }}>{exams.length === 0 && !loading ? <Empty text="No exams yet." /> : exams.map(e => <div key={e.id} style={{ padding: '14px 0', borderBottom: '1px solid #1c1c1c' }}><div>{e.title}</div><div style={{ color: '#777', fontSize: 13, marginTop: 4 }}>{subjectName(e.subject_id)} · {new Date(e.exam_at).toLocaleDateString()}</div></div>)}</div></Card>
        </section>
      </div>
    </main>
  )
}
function Empty({ text }: { text: string }) { return <div style={{ color: '#777', padding: '18px 0' }}>{text}</div> }
function Card({ title, children, large = false }: { title: string; children: React.ReactNode; large?: boolean }) { return <div style={{ border: '1px solid #222', borderRadius: 18, padding: large ? 28 : 20, background: 'rgba(255,255,255,.025)', minHeight: large ? 260 : 150 }}><div style={{ fontSize: 15, color: '#ddd' }}>{title}</div>{children}</div> }
