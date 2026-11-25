import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, BriefcaseBusiness, Check, CircleDollarSign,
  LayoutDashboard, MapPin, MoreHorizontal, Play, RefreshCw, Search,
  Settings2, SlidersHorizontal, Sparkles, Target,
} from 'lucide-react'
import './styles.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const TEST_READ_ONLY = import.meta.env.VITE_TEST_READ_ONLY === 'true'

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
  const [authenticated, setAuthenticated] = useState(TEST_READ_ONLY)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [runMessage, setRunMessage] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [filterOpen, setFilterOpen] = useState(false)
  const [minimumScore, setMinimumScore] = useState(0)
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [emailOnRun, setEmailOnRun] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/dashboard`, { credentials: 'include' })
      if (response.status === 401) {
        setAuthenticated(false)
        setDashboard(null)
        return
      }
      if (!response.ok) throw new Error('API unavailable')
      setDashboard(await response.json())
      setAuthenticated(true)
      setAuthError('')
    } catch {
      setAuthError('Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const login = async (event) => {
    event.preventDefault()
    setAuthError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        setAuthError(response.status === 503
          ? 'The backend password is not configured.'
          : 'The password is incorrect.')
        return
      }
      setPassword('')
      setAuthenticated(true)
      await load()
    } catch {
      setAuthError('Could not connect to the backend.')
    }
  }

  const runAgent = async () => {
    setRunning(true)
    setRunMessage('')
    try {
      const response = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live', limit: 10, no_draft: false, send_email: emailOnRun }),
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
        credentials: 'include',
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
    const matchesScore = Number(job.score || 0) >= minimumScore
    const matchesLocation =
      locationFilter === 'All locations' ||
      String(job.location || '').toLowerCase().includes(locationFilter.toLowerCase())
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Strong matches' && Number(job.score) >= 7) ||
      (filter === 'Applied' && job.applied)
    return matchesQuery && matchesScore && matchesLocation && matchesFilter
  }), [jobs, query, filter, minimumScore, locationFilter])

  const profile = dashboard?.profile || {
    name: 'Job Search Profile',
    current_title: 'Profile unavailable',
    core_skills: [],
    target_titles: [],
  }
  const stats = dashboard?.stats || {}

  if (!authenticated) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="brand-mark login-mark"><Target size={22} /></div>
          <p className="eyebrow">PRIVATE WORKSPACE</p>
          <h1>Sign in to Job Hunt</h1>
          <p>Enter the workspace password configured on the backend.</p>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          {authError && <div className="login-error">{authError}</div>}
          <button className="primary-button login-button" type="submit">Continue</button>
        </form>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Target size={20} strokeWidth={2.1} /></div>
          <span>Job Hunt</span>
        </div>
        <nav>
          <button className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`} onClick={() => setActiveTab('Overview')}><LayoutDashboard size={18} />Overview</button>
          <button className={`nav-item ${activeTab === 'Opportunities' ? 'active' : ''}`} onClick={() => setActiveTab('Opportunities')}><BriefcaseBusiness size={18} />Opportunities<span className="nav-count">{jobs.length}</span></button>
          <button className={`nav-item ${activeTab === 'Application kit' ? 'active' : ''}`} onClick={() => setActiveTab('Application kit')}><CircleDollarSign size={18} />Application kit</button>
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${activeTab === 'Preferences' ? 'active' : ''}`} onClick={() => setActiveTab('Preferences')}><Settings2 size={18} />Preferences</button>
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
            {!TEST_READ_ONLY && (
              <button className="primary-button" onClick={runAgent} disabled={running}>
                {running ? <RefreshCw size={17} className="spinning" /> : <Play size={17} fill="currentColor" />}
                {running ? 'Running search' : 'Run search'}
              </button>
            )}
          </div>
        </header>

        {TEST_READ_ONLY && <div className="test-mode-notice">Temporary read-only test mode is on. Dashboard data is public; turn it off after testing.</div>}
        {authError && <div className="run-message">{authError}</div>}
        {runMessage && <div className="run-message">{runMessage}</div>}

        {activeTab === 'Overview' && (
          <>
            <section className="stats-grid">
              <StatCard icon={BriefcaseBusiness} label="Jobs tracked" value={stats.tracked ?? jobs.length} detail="Across all source boards" accent="blue" />
              <StatCard icon={Sparkles} label="Strong matches" value={jobs.filter((job) => Number(job.score) >= 7).length} detail={`Score of ${dashboard?.config?.score_threshold || 7}+`} accent="violet" />
              <StatCard icon={Check} label="Applications" value={stats.applied ?? 0} detail="Marked by you" accent="green" />
              <StatCard icon={Target} label="Source boards" value={stats.boards ?? 15} detail="Greenhouse, Lever & Ashby" accent="amber" />
            </section>
            <section className="content-grid">
              <div className="opportunities">
                <div className="section-heading">
                  <div><p className="eyebrow">DISCOVERED FOR YOU</p><h2>Latest opportunities</h2></div>
                  <button className="filter-button" onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal size={16} />Filters</button>
                </div>
                {filterOpen && (
                  <div className="advanced-filters">
                    <label>Minimum match
                      <input type="range" min="0" max="10" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} />
                      <span>{minimumScore}/10</span>
                    </label>
                    <label>Location
                      <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                        <option>All locations</option>
                        <option>Pune</option>
                        <option>Bengaluru</option>
                        <option>India</option>
                        <option>Remote</option>
                      </select>
                    </label>
                    <button onClick={() => { setMinimumScore(0); setLocationFilter('All locations'); setFilter('All'); setQuery('') }}>Clear filters</button>
                  </div>
                )}
                <div className="toolbar">
                  <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company" /></label>
                  <div className="filter-tabs">
                    {['All', 'Strong matches', 'Applied'].map((item) => (
                      <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="job-list">
                  {filteredJobs.slice(0, 6).map((job) => (
                    <article className="job-card" key={job.job_id}>
                      <div className="company-logo">{job.company?.slice(0, 1).toUpperCase()}</div>
                      <div className="job-main">
                        <div className="job-title-row"><div><h3>{job.title}</h3><p>{job.company}<span>•</span><MapPin size={13} />{job.location || 'Location not listed'}</p></div><Score value={job.score} /></div>
                        <p className="job-reason">{job.reason || 'This role has been ranked against your profile.'}</p>
                        <div className="job-actions">
                          <button className={`applied-button ${job.applied ? 'done' : ''}`} onClick={() => toggleApplied(job)} disabled={TEST_READ_ONLY}>{job.applied ? <Check size={15} /> : null}{job.applied ? 'Applied' : 'Mark applied'}</button>
                          {job.url && job.url !== '#' && <a href={job.url} target="_blank" rel="noreferrer">View role <ArrowUpRight size={15} /></a>}
                        </div>
                      </div>
                    </article>
                  ))}
                  {filteredJobs.length === 0 && <div className="empty-state"><Search size={22} /><strong>No opportunities found</strong><span>Try another search or filter.</span></div>}
                </div>
              </div>
              <aside className="profile-panel">
                <div className="profile-header">
                  <div><p className="eyebrow">CANDIDATE PROFILE</p><h2>Search profile</h2></div>
                  <div className="menu-anchor">
                    <button className="icon-button" onClick={() => setProfileMenuOpen((open) => !open)} aria-label="Profile menu"><MoreHorizontal size={17} /></button>
                    {profileMenuOpen && <div className="profile-menu"><button onClick={() => setActiveTab('Preferences')}>Edit search profile</button><button onClick={load}>Refresh profile</button></div>}
                  </div>
                </div>
                <div className="profile-person"><Avatar name={profile.name} /><div><strong>{profile.name}</strong><span>{profile.current_title}</span></div></div>
                <div className="profile-section"><span>CORE SKILLS</span><div className="skills">{(profile.core_skills || []).slice(0, 8).map((skill) => <b key={skill}>{skill}</b>)}</div></div>
                <div className="profile-section"><span>TARGET ROLES</span>{(profile.target_titles || []).slice(0, 3).map((title) => <div className="target-role" key={title}><BriefcaseBusiness size={15} /><p>{title}</p></div>)}</div>
                <div className="agent-status"><div className="status-dot" /><div><strong>Agent ready</strong><span>Daily search configured</span></div></div>
              </aside>
            </section>
          </>
        )}

        {activeTab === 'Opportunities' && (
          <section className="workspace-view">
            <div className="section-heading"><div><p className="eyebrow">JOB BOARD</p><h2>All opportunities</h2></div><button className="filter-button" onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal size={16} />Filters</button></div>
            {filterOpen && <div className="advanced-filters"><label>Minimum match<input type="range" min="0" max="10" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} /><span>{minimumScore}/10</span></label><label>Location<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option>All locations</option><option>Pune</option><option>Bengaluru</option><option>India</option><option>Remote</option></select></label></div>}
            <div className="toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company" /></label><div className="filter-tabs">{['All', 'Strong matches', 'Applied'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
            <div className="job-list">{filteredJobs.map((job) => <article className="job-card" key={job.job_id}><div className="company-logo">{job.company?.slice(0, 1).toUpperCase()}</div><div className="job-main"><div className="job-title-row"><div><h3>{job.title}</h3><p>{job.company}<span>•</span><MapPin size={13} />{job.location}</p></div><Score value={job.score} /></div><p className="job-reason">{job.reason}</p><div className="job-actions"><button className={`applied-button ${job.applied ? 'done' : ''}`} onClick={() => toggleApplied(job)} disabled={TEST_READ_ONLY}>{job.applied ? <Check size={15} /> : null}{job.applied ? 'Applied' : 'Mark applied'}</button>{job.url && <a href={job.url} target="_blank" rel="noreferrer">View role <ArrowUpRight size={15} /></a>}</div></div></article>)}</div>
          </section>
        )}

        {activeTab === 'Application kit' && (
          <section className="workspace-view kit-view">
            <div className="section-heading"><div><p className="eyebrow">APPLICATION ASSETS</p><h2>Application kit</h2></div></div>
            <div className="kit-grid">
              <article><span>TAILORED ROLES</span><strong>{jobs.filter((job) => Number(job.score) >= 7).length}</strong><p>Roles with your strongest match score.</p></article>
              <article><span>TRACKED APPLICATIONS</span><strong>{stats.applied ?? 0}</strong><p>Applications marked complete in your tracker.</p></article>
              <article><span>SUGGESTED NEXT STEP</span><strong>{jobs.find((job) => Number(job.score) >= 7)?.company || 'Run search'}</strong><p>Open a strong match, review the role, and prepare its application kit.</p></article>
            </div>
          </section>
        )}

        {activeTab === 'Preferences' && (
          <section className="workspace-view preferences-view">
            <div className="section-heading"><div><p className="eyebrow">WORKSPACE SETTINGS</p><h2>Preferences</h2></div></div>
            <div className="preferences-grid">
              <div className="preference-row"><div><strong>Email after a live search</strong><span>Send the daily digest to your configured MAIL_TO address.</span></div><button className={`toggle ${emailOnRun ? 'on' : ''}`} onClick={() => setEmailOnRun((enabled) => !enabled)} aria-label="Toggle email after search"><span /></button></div>
              <div className="preference-row"><div><strong>Minimum match score</strong><span>Filter opportunities below this score.</span></div><div className="preference-control"><input type="range" min="0" max="10" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} /><b>{minimumScore}/10</b></div></div>
              <div className="preference-row"><div><strong>Target locations</strong><span>Used as the quick location filter.</span></div><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option>All locations</option><option>Pune</option><option>Bengaluru</option><option>India</option><option>Remote</option></select></div>
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
