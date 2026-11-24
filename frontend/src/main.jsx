import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign,
  LayoutDashboard, MapPin, MoreHorizontal, Play, RefreshCw, Search,
  Settings2, SlidersHorizontal, Sparkles, Target, UserRound,
} from 'lucide-react'
import './styles.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const fallbackProfile = {
  name: 'Faraz Ali',
  current_title: 'Python Developer Intern',
  years_experience: 0.2,
  core_skills: ['Python', 'Django', 'SQL', 'PostgreSQL', 'REST APIs', 'Git'],
  education: 'Bachelor of Computer Application',
  target_titles: ['Python Backend Developer', 'Junior Backend Engineer'],
}

const fallbackJobs = [
  { job_id: 'ashby:secfix:583140', company: 'Secfix', title: 'Backend Engineer – GTM Engineering', location: 'Remote - India', score: 8, applied: false, reason: 'Good match for a fresh graduate with Python and SQL skills looking for junior backend work.', url: 'https://jobs.ashbyhq.com/secfix/583140f4-b26c-47b4-a9be-c7a88dc3c0f5' },
  { job_id: 'lever:entrata:44eecb', company: 'Entrata', title: 'Software Engineer (AI Document Processing)', location: 'Pune, India', score: 4, applied: false, reason: 'Mid-level software engineering role focused on production deployments and cloud processing.', url: 'https://jobs.lever.co/entrata/44eecb2a-0dcc-4023-8c98-b976e9e92dcb' },
  { job_id: 'lever:weekday:interview', company: 'Weekday', title: 'Interview Coordination Intern', location: 'India', score: 1, applied: false, reason: 'This role is focused on coordination rather than software development.', url: '#' },
]

function Avatar({ name }) {
  const initials = name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'FA'
  return <div className="avatar" title={name}>{initials}</div>
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${accent}`}><Icon size={18} strokeWidth={1.8} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </article>
  )
}

function Score({ value }) {
  const score = Number(value || 0)
  const tone = score >= 7 ? 'strong' : score >= 5 ? 'fair' : 'low'
  return <div className={`score ${tone}`}><strong>{score.toFixed(0)}</strong><span>/10</span></div>
}

function App() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [runMessage, setRunMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/dashboard`)
      if (!response.ok) throw new Error('API unavailable')
      setDashboard(await response.json())
    } catch {
      setDashboard({
        profile: fallbackProfile,
        jobs: fallbackJobs,
        stats: { tracked: 21, emailed: 18, applied: 1, average_score: 4.8, boards: 15 },
        config: { score_threshold: 7, max_per_digest: 5 },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const runAgent = async () => {
    setRunning(true)
    setRunMessage('')
    try {
      const response = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live', limit: 10, no_draft: false }),
      })
      const data = await response.json()
      setRunMessage(data.ok ? 'Run completed successfully' : 'Run completed with warnings')
      await load()
    } catch {
      setRunMessage('Backend is unavailable. Start the API or check VITE_API_URL.')
    } finally {
      setRunning(false)
    }
  }

  const toggleApplied = async (job) => {
    try {
      const response = await fetch(`${API_URL}/api/jobs/${encodeURIComponent(job.job_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applied: !job.applied }),
      })
      if (response.ok) await load()
    } catch {
      setDashboard((current) => ({
        ...current,
        jobs: current.jobs.map((item) => item.job_id === job.job_id ? { ...item, applied: !item.applied } : item),
      }))
    }
  }

  const jobs = dashboard?.jobs || []
  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesQuery = `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Strong matches' && Number(job.score) >= 7) ||
      (filter === 'Applied' && job.applied)
    return matchesQuery && matchesFilter
  }), [jobs, query, filter])

  const profile = dashboard?.profile || fallbackProfile
  const stats = dashboard?.stats || {}

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Target size={20} strokeWidth={2.1} /></div>
          <span>Job Hunt</span>
        </div>
        <nav>
          <button className="nav-item active"><LayoutDashboard size={18} />Overview</button>
          <button className="nav-item"><BriefcaseBusiness size={18} />Opportunities<span className="nav-count">{jobs.length}</span></button>
          <button className="nav-item"><CircleDollarSign size={18} />Application kit</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings2 size={18} />Preferences</button>
          <div className="profile-mini">
            <Avatar name={profile.name} />
            <div><strong>{profile.name}</strong><span>{profile.current_title}</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE</p>
            <h1>Good morning, {profile.name?.split(' ')[0] || 'there'}.</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" onClick={load} aria-label="Refresh dashboard"><RefreshCw size={17} className={loading ? 'spinning' : ''} /></button>
            <button className="primary-button" onClick={runAgent} disabled={running}>
              {running ? <RefreshCw size={17} className="spinning" /> : <Play size={17} fill="currentColor" />}
              {running ? 'Running search' : 'Run search'}
            </button>
          </div>
        </header>

        {runMessage && <div className="run-message">{runMessage}</div>}

        <section className="stats-grid">
          <StatCard icon={BriefcaseBusiness} label="Jobs tracked" value={stats.tracked ?? jobs.length} detail="Across all source boards" accent="blue" />
          <StatCard icon={Sparkles} label="Strong matches" value={jobs.filter((job) => Number(job.score) >= 7).length} detail={`Score of ${dashboard?.config?.score_threshold || 7}+`} accent="violet" />
          <StatCard icon={Check} label="Applications" value={stats.applied ?? 0} detail="Marked by you" accent="green" />
          <StatCard icon={Target} label="Source boards" value={stats.boards ?? 15} detail="Greenhouse, Lever & Ashby" accent="amber" />
        </section>

        <section className="content-grid">
          <div className="opportunities">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DISCOVERED FOR YOU</p>
                <h2>Latest opportunities</h2>
              </div>
              <button className="filter-button"><SlidersHorizontal size={16} />Filters</button>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company" />
              </label>
              <div className="filter-tabs">
                {['All', 'Strong matches', 'Applied'].map((item) => (
                  <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="job-list">
              {filteredJobs.map((job) => (
                <article className="job-card" key={job.job_id}>
                  <div className="company-logo">{job.company?.slice(0, 1).toUpperCase()}</div>
                  <div className="job-main">
                    <div className="job-title-row">
                      <div>
                        <h3>{job.title}</h3>
                        <p>{job.company}<span>•</span><MapPin size={13} />{job.location || 'Location not listed'}</p>
                      </div>
                      <Score value={job.score} />
                    </div>
                    <p className="job-reason">{job.reason || 'This role has been ranked against your profile.'}</p>
                    <div className="job-actions">
                      <button className={`applied-button ${job.applied ? 'done' : ''}`} onClick={() => toggleApplied(job)}>
                        {job.applied ? <Check size={15} /> : null}{job.applied ? 'Applied' : 'Mark applied'}
                      </button>
                      {job.url && job.url !== '#' && (
                        <a href={job.url} target="_blank" rel="noreferrer">View role <ArrowUpRight size={15} /></a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {filteredJobs.length === 0 && (
                <div className="empty-state"><Search size={22} /><strong>No opportunities found</strong><span>Try another search or filter.</span></div>
              )}
            </div>
          </div>

          <aside className="profile-panel">
            <div className="profile-header">
              <div>
                <p className="eyebrow">CANDIDATE PROFILE</p>
                <h2>Search profile</h2>
              </div>
              <button className="icon-button" aria-label="Profile menu"><MoreHorizontal size={17} /></button>
            </div>
            <div className="profile-person">
              <Avatar name={profile.name} />
              <div><strong>{profile.name}</strong><span>{profile.current_title}</span></div>
            </div>
            <div className="profile-section">
              <span>CORE SKILLS</span>
              <div className="skills">
                {(profile.core_skills || []).slice(0, 8).map((skill) => <b key={skill}>{skill}</b>)}
              </div>
            </div>
            <div className="profile-section">
              <span>TARGET ROLES</span>
              {(profile.target_titles || []).slice(0, 3).map((title) => (
                <div className="target-role" key={title}><BriefcaseBusiness size={15} /><p>{title}</p></div>
              ))}
            </div>
            <div className="agent-status">
              <div className="status-dot" />
              <div><strong>Agent ready</strong><span>Daily search configured</span></div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
