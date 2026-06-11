'use client'
import { useState, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import { fetchProfiles, fetchTasks, fetchHuddles, fetchGuestDelights } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ butlers: 0, tasks: 0, delights: 0, huddles: 0 })
  const [taskStats, setTaskStats] = useState({ completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [butlers, tasks, delights, huddles] = await Promise.all([
        fetchProfiles(),
        fetchTasks(),
        fetchGuestDelights(),
        fetchHuddles(),
      ])

      setStats({
        butlers: butlers.length,
        tasks: tasks.length,
        delights: delights.length,
        huddles: huddles.length,
      })

      const completed = tasks.filter(t => t.status === 'completed').length
      const pending = tasks.filter(t => t.status !== 'completed').length
      setTaskStats({ completed, pending })
    } catch (err) {
      console.error('Load stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <Topbar
        title={user?.role === 'butler' ? `Welcome, ${user?.name || 'Butler'} 👋` : 'Operations dashboard'}
        subtitle={today}
        actions={<a href="/allocation" style={{ textDecoration: 'none' }}><button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Assign task</button></a>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.butlers}</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.tasks}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{taskStats.completed} completed, {taskStats.pending} pending</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guest delights</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.delights}</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Huddles scheduled</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.huddles}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="sv-card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Quick actions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/delight" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>🎁 Log activity</a>
            <a href="/tasks" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>✓ View tasks</a>
            <a href="/training" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>📚 Training</a>
            <a href="/huddle" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>💬 Huddles</a>
          </div>
        </div>

        {/* Status Overview */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Status overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(151,196,89,0.15)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 4 }}>On Track</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#97C459' }}>{taskStats.completed}</div>
            </div>
            <div style={{ background: 'rgba(156,204,252,0.15)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 4 }}>Pending</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#9CCCFC' }}>{taskStats.pending}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
