'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type DayData = {
  date: string        // YYYY-MM-DD
  bookingIds: string[]
  butlers: string[]
  avgRating: number | null
  registeredCount: number
  totalCount: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getRatingColor(rating: number | null) {
  if (rating === null) return '#E5E7EB'
  if (rating >= 4.5) return '#97C459'
  if (rating >= 3.5) return '#FED5A9'
  return '#E9A0A7'
}

function getIntensityBg(count: number, max: number) {
  if (count === 0) return '#F9FAFB'
  const intensity = Math.max(0.15, count / Math.max(max, 1))
  return `rgba(156,204,252,${Math.min(intensity * 0.9 + 0.1, 0.95)})`
}

export default function CheckinCalendar({ delights, month, year }: {
  delights: any[]
  month: number
  year: number
}) {
  const [viewMonth, setViewMonth] = useState(month)
  const [viewYear,  setViewYear]  = useState(year)
  const [selected,  setSelected]  = useState<DayData | null>(null)
  const router = useRouter()

  // Build day-level data from delights (which have booking_id + booking_date + your_name)
  const dayMap = useMemo(() => {
    const map: Record<string, DayData> = {}

    delights.forEach((d: any) => {
      if (!d.booking_date) return
      const date = d.booking_date.slice(0, 10)
      const dateObj = new Date(date + 'T12:00:00')
      if (dateObj.getMonth() !== viewMonth || dateObj.getFullYear() !== viewYear) return

      if (!map[date]) map[date] = { date, bookingIds: [], butlers: [], avgRating: null, registeredCount: 0, totalCount: 0 }
      const entry = map[date]

      if (d.booking_id && !entry.bookingIds.includes(d.booking_id)) entry.bookingIds.push(d.booking_id)
      if (d.your_name  && !entry.butlers.includes(d.your_name))     entry.butlers.push(d.your_name)
      entry.totalCount++
    })

    return map
  }, [delights, viewMonth, viewYear])

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const maxBookings = Math.max(...Object.values(dayMap).map(d => d.bookingIds.length), 1)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  // Pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelected(null)
  }

  const totalBookings = Object.values(dayMap).reduce((s, d) => s + d.bookingIds.length, 0)
  const activeDays    = Object.values(dayMap).filter(d => d.bookingIds.length > 0).length

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Check-in Calendar</div>
      <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 14 }}>
        Booking activity by date — {totalBookings} bookings across {activeDays} active days
      </div>

      <div className="sv-card" style={{ padding: 16 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{MONTHS[viewMonth]} {viewYear}</div>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted-fg)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const data = dayMap[dateStr]
            const count = data?.bookingIds.length || 0
            const isSelected = selected?.date === dateStr
            const isToday = new Date().toISOString().slice(0,10) === dateStr

            return (
              <div key={day}
                onClick={() => setSelected(data && count > 0 ? data : null)}
                style={{
                  borderRadius: 8,
                  padding: '6px 4px',
                  minHeight: 52,
                  background: isSelected ? '#1B1D1F' : getIntensityBg(count, maxBookings),
                  border: isToday ? '2px solid #9CCCFC' : isSelected ? '2px solid #1B1D1F' : '1.5px solid rgba(0,0,0,0.06)',
                  cursor: count > 0 ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isSelected ? '#fff' : count > 0 ? '#0C447C' : 'var(--muted-fg)' }}>
                  {day}
                </div>
                {count > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? '#9CCCFC' : '#0C447C' }}>{count}</div>
                    <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--muted-fg)' }}>
                      {data.butlers.length} butler{data.butlers.length !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: 'var(--muted-fg)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(156,204,252,0.15)', border: '1px solid rgba(0,0,0,0.08)' }}/>
            <span>1 booking</span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(156,204,252,0.65)' }}/>
            <span>High activity</span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid #9CCCFC' }}/>
            <span>Today</span>
          </div>
        </div>

        {/* Day detail panel */}
        {selected && (
          <div style={{ marginTop: 14, padding: '14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              📅 {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bookings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0C447C', marginTop: 2 }}>{selected.bookingIds.length}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Butlers on duty</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2D5A0E', marginTop: 2 }}>{selected.butlers.length}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg feedback</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.avgRating ? '#2D5A0E' : '#9CA3AF', marginTop: 2 }}>
                  {selected.avgRating ? `${selected.avgRating}/5` : 'NA'}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Registered</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#7A4A08', marginTop: 2 }}>
                  {selected.registeredCount > 0 ? `${selected.registeredCount}/${selected.totalCount}` : 'NA'}
                </div>
              </div>
            </div>

            {/* Butlers list */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Butlers on this day</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.butlers.map(b => (
                  <span key={b} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(151,196,89,0.1)', color: '#2D5A0E', border: '1px solid rgba(151,196,89,0.3)' }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Booking IDs — click to view photos in Task page */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Booking IDs <span style={{ fontWeight: 400, fontSize: 9 }}>(tap to view photos)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selected.bookingIds.map(id => (
                  <button key={id}
                    onClick={() => router.push(`/delight?search=${encodeURIComponent(id)}`)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(156,204,252,0.1)', color: '#0C447C', border: '1px solid rgba(156,204,252,0.3)', fontFamily: 'monospace', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(156,204,252,0.25)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(156,204,252,0.1)' }}>
                    #{id} →
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
