'use client'
import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  chart?: ChartData | null
  table?: TableData | null
}

type ChartData = {
  type: 'bar' | 'line' | 'donut'
  title: string
  labels: string[]
  values: number[]
  color?: string
}

type TableData = {
  headers: string[]
  rows: (string | number)[][]
}

const QUICK_PROMPTS = [
  'Who has the lowest delight completion?',
  'Task completion rate by butler this month',
  'Which squad needs the most improvement?',
  'Show attendance trends',
  'Top performing butler this month',
  'Pending tasks breakdown by type',
]

function MiniBarChart({ chart }: { chart: ChartData }) {
  const max = Math.max(...chart.values, 1)
  const colors = ['#9CCCFC','#97C459','#FED5A9','#E9A0A7','#C4B5FD','#FDE68A','#6EE7B7']
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--sv-dark)' }}>{chart.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chart.labels.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', width: 110, flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: 4, height: 20, position: 'relative' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${Math.max((chart.values[i] / max) * 100, 2)}%`,
                background: colors[i % colors.length],
                transition: 'width 0.6s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                  {typeof chart.values[i] === 'number' && chart.values[i] <= 1 && chart.values[i] >= 0 && !Number.isInteger(chart.values[i])
                    ? `${Math.round(chart.values[i] * 100)}%`
                    : chart.values[i]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTable({ table }: { table: TableData }) {
  return (
    <div style={{ marginTop: 12, overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {table.headers.map(h => (
              <th key={h} style={{ padding: '7px 10px', background: '#1B1D1F', color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #374151' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '7px 10px', border: '1px solid #E5E7EB', color: 'var(--sv-dark)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AIInsights({ data }: {
  data: {
    butlers: any[]
    tasks: any[]
    delights: any[]
    photos: any[]
    attendance: any[]
    month: number
    year: number
    dateFrom: string
    dateTo: string
  }
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function ask(question: string) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      // Build a rich context summary for the AI
      const now = new Date()
      const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][data.month]

      // Compute per-butler stats
      const butlerStats = data.butlers
        .filter(b => b.squad && b.squad !== 'All')
        .map(b => {
          const bTasks = data.tasks.filter(t =>
            t.butler_id === b.id || (t.notes||'').includes(`Butler: ${b.name}`)
          )
          const bDelights = data.delights.filter(d =>
            (d.your_name||'').toLowerCase().trim() === b.name.toLowerCase().trim()
          )
          const bPhotos = bDelights.flatMap(d => data.photos.filter(p => p.delight_id === d.id))
          const completed = bTasks.filter(t => t.status === 'completed').length
          const delightsWithPhotos = bDelights.filter(d => data.photos.some(p => p.delight_id === d.id)).length
          const bAttendance = data.attendance.filter(a => a.butler_id === b.id)
          const presentDays = bAttendance.filter(a => a.status === 'present').length

          return {
            name: b.name, squad: b.squad,
            totalTasks: bTasks.length,
            completedTasks: completed,
            taskCompletionPct: bTasks.length > 0 ? Math.round(completed/bTasks.length*100) : 0,
            totalDelights: bDelights.length,
            delightsWithPhotos,
            delightCompletionPct: bDelights.length > 0 ? Math.round(delightsWithPhotos/bDelights.length*100) : 0,
            presentDays,
            totalPhotos: bPhotos.length,
          }
        })

      // Squad summaries
      const squads = [...new Set(data.butlers.map(b=>b.squad).filter(s=>s&&s!=='All'))]
      const squadStats = squads.map(squad => {
        const sb = butlerStats.filter(b => b.squad === squad)
        return {
          squad,
          butlers: sb.length,
          avgTaskCompletion: sb.length ? Math.round(sb.reduce((a,b)=>a+b.taskCompletionPct,0)/sb.length) : 0,
          avgDelightCompletion: sb.length ? Math.round(sb.reduce((a,b)=>a+b.delightCompletionPct,0)/sb.length) : 0,
          totalTasks: sb.reduce((a,b)=>a+b.totalTasks,0),
          totalDelights: sb.reduce((a,b)=>a+b.totalDelights,0),
        }
      })

      const context = `
You are an AI analyst for StayVista, a luxury villa rental company. You analyse butler performance data.

DATE RANGE: ${data.dateFrom} to ${data.dateTo} (${monthName} ${data.year})
TOTAL BUTLERS: ${data.butlers.filter(b=>b.squad&&b.squad!=='All').length}
TOTAL TASKS: ${data.tasks.length} (${data.tasks.filter(t=>t.status==='completed').length} completed)
TOTAL DELIGHTS: ${data.delights.length}

PER-BUTLER STATS:
${butlerStats.map(b => `- ${b.name} (${b.squad}): Tasks ${b.completedTasks}/${b.totalTasks} (${b.taskCompletionPct}%), Delights ${b.delightsWithPhotos}/${b.totalDelights} (${b.delightCompletionPct}%), Present ${b.presentDays} days`).join('\n')}

SQUAD STATS:
${squadStats.map(s => `- ${s.squad}: ${s.butlers} butlers, avg task completion ${s.avgTaskCompletion}%, avg delight completion ${s.avgDelightCompletion}%, total tasks ${s.totalTasks}`).join('\n')}

TASK TYPES THIS PERIOD:
- Check-In: ${data.tasks.filter(t=>t.type==='Check-In').length}
- Check-Out: ${data.tasks.filter(t=>t.type==='Check-Out').length}
- Booking: ${data.tasks.filter(t=>t.type==='Booking'||t.type==='Booking (full day)').length}
- Non Booking: ${data.tasks.filter(t=>t.type==='Non Booking'||t.type==='Non Booking Task').length}
- Pending: ${data.tasks.filter(t=>t.status==='pending').length}
- Rejected: ${data.tasks.filter(t=>t.status==='rejected').length}

TARGETS: Utilisation 25/month, 7Star 60%, OTA 50%, Guest Welcome 80%, Guest Delight 100%, Registration 100%

The user (admin) asked: "${q}"

Respond with a JSON object ONLY — no markdown, no explanation outside JSON:
{
  "answer": "Your insight text here (2-4 sentences, direct and actionable)",
  "chart": null OR {
    "type": "bar",
    "title": "Chart title",
    "labels": ["Butler1", "Butler2", ...],
    "values": [number, number, ...]
  },
  "table": null OR {
    "headers": ["Col1", "Col2", ...],
    "rows": [["val1", "val2"], ...]
  }
}

Rules:
- Always include a chart OR table when data supports it (prefer chart for comparisons, table for rankings/details)
- Keep answer text concise and specific to StayVista operations
- For % values in charts use decimals (0.75 not 75) only if all values are ≤1, otherwise use whole numbers
- Sort chart/table data by most relevant metric descending`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: context }],
        }),
      })

      const result = await res.json()
      const raw = result.content?.[0]?.text || '{}'
      let parsed: any = {}
      try {
        const cleaned = raw.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = { answer: raw.slice(0, 300), chart: null, table: null }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: parsed.answer || 'Here is the analysis.',
        chart: parsed.chart || null,
        table: parsed.table || null,
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ marginTop: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#9CCCFC,#C4B5FD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✦</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sv-dark)' }}>AI Insights</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>Ask anything about your butler data</div>
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted-fg)' }}>
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="sv-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Quick prompts */}
          {messages.length === 0 && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Suggested questions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => ask(p)}
                    style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.1)', background: '#F9FAFB', color: 'var(--sv-dark)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div style={{ maxHeight: 420, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: msg.role === 'user' ? '#1B1D1F' : 'linear-gradient(135deg,#9CCCFC,#C4B5FD)', color: '#fff' }}>
                    {msg.role === 'user' ? '👤' : '✦'}
                  </div>
                  <div style={{ flex: 1, maxWidth: '85%' }}>
                    <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 10, background: msg.role === 'user' ? '#1B1D1F' : '#F9FAFB', color: msg.role === 'user' ? '#fff' : 'var(--sv-dark)', border: msg.role === 'assistant' ? '1px solid #E5E7EB' : 'none', lineHeight: 1.6 }}>
                      {msg.content}
                    </div>
                    {msg.chart && <MiniBarChart chart={msg.chart} />}
                    {msg.table && <MiniTable table={msg.table} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#9CCCFC,#C4B5FD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>✦</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Analysing data…</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: messages.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', gap: 8 }}>
            <input
              className="sv-input"
              style={{ flex: 1, fontSize: 13 }}
              placeholder="Ask about butler performance, tasks, delights…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
              disabled={loading}
            />
            <button
              className="sv-btn sv-btn-primary"
              style={{ fontSize: 13, padding: '0 16px', flexShrink: 0 }}
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}>
              {loading ? '…' : '→'}
            </button>
            {messages.length > 0 && (
              <button className="sv-btn" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => setMessages([])}>Clear</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
