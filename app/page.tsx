const modules = [
  ['Dashboard', 'Your day at a glance'],
  ['Assignments', 'Deadlines, tasks & progress'],
  ['Tempo', 'Your intelligent study planner'],
  ['Calendar', 'Classes, exams & events'],
  ['Notes', 'Capture and organize knowledge'],
  ['Study', 'Focus sessions & history'],
  ['Flashcards', 'Spaced repetition'],
  ['Quizzes', 'Practice & exam prep'],
  ['Grades', 'Track performance'],
  ['Languages', 'Vocabulary, grammar & practice'],
]

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '32px', background: 'radial-gradient(circle at top right, #191919, #080808 45%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 3, color: '#888', textTransform: 'uppercase' }}>School OS</div>
            <h1 style={{ fontSize: 44, margin: '10px 0 0', letterSpacing: -2 }}>Your school life. One system.</h1>
          </div>
          <div style={{ color: '#888', fontSize: 14 }}>Powered by Tempo</div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card title="Good afternoon" large>
            <p style={{ color: '#999', marginTop: 8 }}>Here’s what needs your attention today.</p>
            <div style={{ marginTop: 28, fontSize: 30 }}>No tasks yet</div>
            <div style={{ color: '#777', marginTop: 6 }}>Your dashboard will populate as you add school work.</div>
          </Card>
          <Card title="Tempo">
            <div style={{ fontSize: 28, marginTop: 18 }}>Ready</div>
            <div style={{ color: '#888', marginTop: 6 }}>Build today’s smartest study plan.</div>
          </Card>
          <Card title="Focus">
            <div style={{ fontSize: 28, marginTop: 18 }}>0 min</div>
            <div style={{ color: '#888', marginTop: 6 }}>Study time today</div>
          </Card>
        </section>

        <section>
          <div style={{ color: '#777', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: '34px 0 14px' }}>Modules</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {modules.map(([name, description]) => <Card key={name} title={name}><div style={{ color: '#888', marginTop: 10, lineHeight: 1.5 }}>{description}</div></Card>)}
          </div>
        </section>
      </div>
    </main>
  )
}

function Card({ title, children, large = false }: { title: string; children: React.ReactNode; large?: boolean }) {
  return <div style={{ border: '1px solid #222', borderRadius: 18, padding: large ? 28 : 20, background: 'rgba(255,255,255,.025)', minHeight: large ? 260 : 150 }}><div style={{ fontSize: 15, color: '#ddd' }}>{title}</div>{children}</div>
}
