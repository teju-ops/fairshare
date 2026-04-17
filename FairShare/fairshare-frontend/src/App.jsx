import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Home,
  IndianRupee,
  Moon,
  Plus,
  Receipt,
  Shield,
  Sparkles,
  TrendingUp,
  Upload,
  User,
  Users,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://fairshare-backend.onrender.com/api')

const tabs = [
  { id: 'overview', label: 'HOME', icon: Home },
  { id: 'groups', label: 'GROUPS', icon: Users },
  { id: 'add', label: 'ADD', icon: Plus, center: true },
  { id: 'analytics', label: 'STATS', icon: TrendingUp },
  { id: 'profile', label: 'PROFILE', icon: User },
]

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0))

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0))

const iconMap = {
  bed: Wallet,
  utensils: Utensils,
  wallet: CreditCard,
  receipt: Receipt,
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [appState, setAppState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [expenseForm, setExpenseForm] = useState({
    amount: '0.00',
    title: '',
    strategy: 'equal',
    receiptName: '',
    participantIds: [],
  })

  useEffect(() => {
    let cancelled = false

    const loadState = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/demo/state`)
        if (!response.ok) {
          throw new Error('Unable to load FairShare data.')
        }

        const data = await response.json()
        if (cancelled) return

        setAppState(data)
        setExpenseForm((current) => ({
          ...current,
          strategy: data.addExpenseDefaults?.strategy || 'equal',
          participantIds:
            data.participants?.filter((person) => person.selected).map((person) => person.id) || [],
        }))
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const selectedParticipants = useMemo(
    () =>
      appState?.participants?.filter((person) => expenseForm.participantIds.includes(person.id)) || [],
    [appState, expenseForm.participantIds]
  )

  if (loading) {
    return <LoadingState />
  }

  if (error || !appState) {
    return (
      <div className="app-shell">
        <div className="error-state">
          <Sparkles size={28} />
          <h1>FairShare couldn&apos;t load</h1>
          <p>{error || 'Something went wrong while loading the app.'}</p>
        </div>
      </div>
    )
  }

  const handleParticipantToggle = (participantId) => {
    setExpenseForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(participantId)
        ? current.participantIds.filter((id) => id !== participantId)
        : [...current.participantIds, participantId],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = expenseForm.participantIds.length === appState.participants.length
    setExpenseForm((current) => ({
      ...current,
      participantIds: allSelected ? [] : appState.participants.map((person) => person.id),
    }))
  }

  const handleSaveExpense = async () => {
    try {
      setSaving(true)
      const payload = {
        amount: Number(expenseForm.amount || 0),
        title: expenseForm.title,
        strategy: expenseForm.strategy,
        receiptName: expenseForm.receiptName,
        participantIds: expenseForm.participantIds,
      }

      const response = await fetch(`${API_BASE}/demo/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Unable to save expense right now.')
      }

      const data = await response.json()
      setAppState(data.state)
      setToast(`${payload.title || 'Expense'} saved successfully`)
      setExpenseForm((current) => ({
        ...current,
        amount: '0.00',
        title: '',
        receiptName: '',
      }))
      setActiveTab('groups')
    } catch (requestError) {
      setToast(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />

      {activeTab === 'overview' && <OverviewScreen state={appState} onNavigate={setActiveTab} />}
      {activeTab === 'groups' && <GroupsScreen state={appState} />}
      {activeTab === 'add' && (
        <AddExpenseScreen
          form={expenseForm}
          state={appState}
          saving={saving}
          selectedParticipants={selectedParticipants}
          onFormChange={setExpenseForm}
          onParticipantToggle={handleParticipantToggle}
          onSelectAll={handleSelectAll}
          onSave={handleSaveExpense}
        />
      )}
      {activeTab === 'analytics' && <AnalyticsScreen state={appState} />}
      {activeTab === 'profile' && <ProfileScreen state={appState} setState={setAppState} />}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="app-shell">
      <div className="loading-state">
        <div className="loading-ring" />
        <p>Loading FairShare...</p>
      </div>
    </div>
  )
}

function TopBar({ title = 'FairShare', back = false, avatar = 'FS', subtitle }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {back ? (
          <button className="icon-button muted" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="brand-avatar">{avatar}</div>
        )}
        <div>
          <div className={`brand-title ${back ? 'brand-title-back' : ''}`}>{title}</div>
          {subtitle ? <div className="brand-subtitle">{subtitle}</div> : null}
        </div>
      </div>

      <button className="icon-button" aria-label="Notifications">
        <Bell size={16} />
      </button>
    </header>
  )
}

function OverviewScreen({ state, onNavigate }) {
  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} />

      <section className="screen-heading">
        <h1>Overview</h1>
      </section>

      <section className="metric-grid">
        <MetricCard
          label="TOTAL OWED TO YOU"
          value={currency(state.overview.totalOwedToYou)}
          footnote={`+${state.overview.changeFromLastWeek}% from last week`}
          highlight
        />
        <MetricCard
          label="TOTAL YOU OWE"
          value={currency(state.overview.totalYouOwe)}
          footnote={`${state.overview.pendingSettlements} pending settlements`}
        />
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Active Groups</h2>
            <p>Shared expenses across your circles</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('groups')}>
            View all
          </button>
        </div>

        <div className="stack">
          {state.groups.map((group) => (
            <article className="group-card" key={group.id}>
              <div className="group-card-header">
                <div className="group-thumb">{group.name[0]}</div>
                <span className="pill">{group.status}</span>
              </div>
              <h3>{group.name}</h3>
              <p>
                {group.members} members • {currency(group.totalSpend)} total
              </p>
              <div className="mini-avatars">
                {group.avatars.map((avatar, index) => (
                  <span key={`${group.id}-${avatar}-${index}`}>{avatar}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <button className="filter-chip">Filter</button>
        </div>
        <div className="stack compact">
          {state.activity.map((item) => (
            <article className="activity-row" key={item.id}>
              <div className={`activity-dot ${item.tint}`} />
              <div className="activity-copy">
                <h3>{item.title}</h3>
                <p>
                  {item.context} • {item.date}
                </p>
              </div>
              <strong className={item.tint === 'credit' ? 'positive' : 'negative'}>
                {item.amount > 0 ? '+' : '-'}
                {currency(Math.abs(item.amount))}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-card">
        <div>
          <p className="eyebrow">Smart Split Suggestion</p>
          <h3>Based on your recent activity</h3>
          <p>FairShare suggests weight-based splits for travel-heavy group trips.</p>
        </div>
        <button className="cta-mini" onClick={() => onNavigate('add')} aria-label="Add expense">
          +
        </button>
      </section>
    </main>
  )
}

function GroupsScreen({ state }) {
  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} />

      <section className="trip-hero">
        <h1>{state.trip.title}</h1>
        <div className="trip-total">
          <span>TOTAL SPEND</span>
          <strong>{currency(state.trip.totalSpend)}</strong>
        </div>

        <div className="trip-members">
          <div className="member-stack">
            {state.groups[0].avatars.map((avatar, index) => (
              <span key={`${avatar}-${index}`} className="member-badge">
                {avatar}
              </span>
            ))}
            <span className="member-extra">+2</span>
          </div>
          <button className="member-add" aria-label="Add member">
            <Users size={14} />
          </button>
        </div>
      </section>

      <section className="settle-card">
        <div className="settle-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h3>
            {state.trip.settleSuggestion.from} owes you {currency(state.trip.settleSuggestion.amount)}
          </h3>
          <p>for {state.trip.settleSuggestion.reason}</p>
          <span>{state.trip.settleSuggestion.note}</span>
        </div>
      </section>

      <button className="primary-button disabled">Settle Now</button>

      <section className="section">
        <div className="section-header">
          <h2>Recent Expenses</h2>
          <button className="text-button">See all</button>
        </div>
        <div className="stack">
          {state.trip.recentExpenses.map((expense) => {
            const Icon = iconMap[expense.icon] || Wallet
            return (
              <article className="expense-card" key={expense.id}>
                <div className="expense-icon">
                  <Icon size={18} />
                </div>
                <div className="expense-copy">
                  <h3>{expense.title}</h3>
                  <p>
                    Paid by {expense.paidBy} • Split by {expense.splitBy}
                  </p>
                </div>
                <div className="expense-values">
                  <strong>{currency(expense.amount)}</strong>
                  <span>{expense.balanceLabel}</span>
                  <small>{currency(expense.balanceAmount)}</small>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function AddExpenseScreen({
  form,
  state,
  saving,
  selectedParticipants,
  onFormChange,
  onParticipantToggle,
  onSelectAll,
  onSave,
}) {
  const allSelected = form.participantIds.length === state.participants.length
  const amount = Number(form.amount || 0)
  const share = selectedParticipants.length ? amount / selectedParticipants.length : 0

  return (
    <main className="screen add-screen">
      <TopBar title="FairShare" avatar={state.user.avatar} back />

      <section className="amount-panel">
        <p className="eyebrow centered">ENTER AMOUNT</p>
        <div className="amount-display">
          <IndianRupee size={24} />
          <input
            aria-label="Amount"
            value={form.amount}
            onChange={(event) => onFormChange((current) => ({ ...current, amount: event.target.value }))}
          />
        </div>
      </section>

      <label className="glass-input">
        <span>What was this for?</span>
        <input
          placeholder="e.g. Dinner at Saravana Bhava"
          value={form.title}
          onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
        />
      </label>

      <label className="upload-card">
        <Upload size={18} />
        <span>Upload Receipt</span>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            onFormChange((current) => ({
              ...current,
              receiptName: current.receiptName ? '' : 'receipt-fairshare.png',
            }))
          }
        >
          {form.receiptName || 'Attach'}
        </button>
      </label>

      <button className="primary-button">
        <Sparkles size={16} />
        Scan with AI
      </button>

      <section className="insight-card">
        <div className="section-header compact-header">
          <span className="eyebrow">AI INSIGHTS</span>
          <Sparkles size={14} />
        </div>
        <p className="tiny-copy">Detected Total</p>
        <div className="insight-grid">
          <strong>{currency(state.addExpenseDefaults.aiInsight.detectedTotal)}</strong>
          <div>
            <p className="tiny-copy">Detected items</p>
            <span>{state.addExpenseDefaults.aiInsight.merchants.join(', ')}</span>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="section-header">
          <h2>Split with</h2>
          <button className="text-button" onClick={onSelectAll}>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div className="participant-row">
          {state.participants.map((person) => (
            <button
              type="button"
              key={person.id}
              className={`participant-chip ${form.participantIds.includes(person.id) ? 'selected' : ''}`}
              onClick={() => onParticipantToggle(person.id)}
            >
              <span style={{ background: person.accent }}>{person.avatar}</span>
              <small>{person.name}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section compact-section">
        <h2>Split Strategy</h2>
        <div className="strategy-tabs">
          {['equal', 'percentage', 'custom'].map((strategy) => (
            <button
              type="button"
              key={strategy}
              className={form.strategy === strategy ? 'active' : ''}
              onClick={() => onFormChange((current) => ({ ...current, strategy }))}
            >
              {strategy}
            </button>
          ))}
        </div>
        <p className="helper-copy">
          {selectedParticipants.length
            ? `Everyone pays an equal share of ${currency(share)}.`
            : 'Select participants to preview the split.'}
        </p>
      </section>

      <button className="primary-button bottom-cta" disabled={saving} onClick={onSave}>
        {saving ? 'Saving...' : 'Save Expense'}
      </button>
    </main>
  )
}

function AnalyticsScreen({ state }) {
  const highestSpend = Math.max(...state.analytics.weeklySpend)
  const totalCategorySpend = state.analytics.categories.reduce(
    (sum, category) => sum + category.amount,
    0
  )

  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} />

      <section className="screen-heading">
        <h1>Analytics</h1>
        <p>Your shared wealth choreography for {state.analytics.monthLabel}</p>
      </section>

      <section className="smart-card">
        <Sparkles size={16} />
        <h3>AI Smart Insight</h3>
        <p>{state.analytics.topInsights[1]}</p>
        <button className="pill-button">View Tips</button>
      </section>

      <section className="chart-card">
        <div className="section-header compact-header">
          <div>
            <span className="tiny-copy">TOTAL SPEND</span>
            <h2>{currency(state.analytics.totalSpend)}</h2>
          </div>
          <div className="segmented">
            <span className="active">Week</span>
            <span>Month</span>
          </div>
        </div>
        <div className="bar-chart">
          {state.analytics.weeklySpend.map((value, index) => (
            <div className="bar-column" key={`${value}-${index}`}>
              <div
                className={`bar ${index === 3 ? 'highlight' : ''}`}
                style={{ height: `${(value / highestSpend) * 100}%` }}
              />
              <span>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-card">
        <span className="tiny-copy">BY CATEGORY</span>
        <div className="distribution-layout">
          <div
            className="donut-chart"
            style={{
              background: `conic-gradient(
                ${state.analytics.categories[0].color} 0deg 154deg,
                ${state.analytics.categories[1].color} 154deg 255deg,
                ${state.analytics.categories[2].color} 255deg 360deg
              )`,
            }}
          >
            <div>
              <strong>{state.analytics.categories.length}</strong>
              <span>CATEGORIES</span>
            </div>
          </div>

          <div className="distribution-legend">
            {state.analytics.categories.map((category) => (
              <div className="legend-row" key={category.name}>
                <span>
                  <i style={{ backgroundColor: category.color }} />
                  {category.name}
                </span>
                <strong>{currency(category.amount)}</strong>
              </div>
            ))}
            <p className="tiny-copy">Total tracked: {compactCurrency(totalCategorySpend)}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Expense Stream</h2>
          <button className="text-button">Export report</button>
        </div>
        <div className="stack compact">
          {state.trip.recentExpenses.slice(0, 2).map((expense) => {
            const Icon = iconMap[expense.icon] || Wallet
            return (
              <article className="activity-row insight-row" key={expense.id}>
                <div className="expense-icon">
                  <Icon size={16} />
                </div>
                <div className="activity-copy">
                  <h3>{expense.title}</h3>
                  <p>
                    Shared via split • {expense.splitBy}
                  </p>
                </div>
                <strong>{currency(expense.amount)}</strong>
              </article>
            )
          })}
        </div>
      </section>

      <section className="score-card">
        <span className="eyebrow">EFFICIENCY SCORE</span>
        <strong>{state.analytics.efficiencyScore}%</strong>
        <p>Your settlement velocity is in the top 5% of all FairShare users.</p>
      </section>
    </main>
  )
}

function ProfileScreen({ state, setState }) {
  const settings = [
    { label: 'Account Settings', icon: User },
    { label: 'Notifications', icon: Bell },
    { label: 'Security & Privacy', icon: Shield },
  ]

  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} />

      <section className="profile-card">
        <div className="profile-avatar">{state.user.avatar}</div>
        <h1>{state.user.name}</h1>
        <p>{state.user.email}</p>
        <div className="profile-stats">
          <div>
            <span>KARMA</span>
            <strong>{currency(state.user.karma)}</strong>
          </div>
          <div>
            <span>GROUPS</span>
            <strong>{state.user.groupsCount}</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Saved Payment Methods</h2>
        <div className="payment-card">
          {state.paymentMethods.map((method) => (
            <div className="payment-row" key={method.id}>
              <div className="payment-icon">
                <Wallet size={16} />
              </div>
              <div className="activity-copy">
                <h3>{method.label}</h3>
                <p>{method.handle}</p>
              </div>
              <Shield size={16} />
            </div>
          ))}
          <button className="primary-button">
            <Zap size={16} />
            Pay via UPI
          </button>
        </div>
      </section>

      <section className="section">
        <h2>Settings</h2>
        <div className="settings-card">
          {settings.map((item) => {
            const Icon = item.icon
            return (
              <div className="setting-row" key={item.label}>
                <div className="setting-label">
                  <span className="setting-icon">
                    <Icon size={14} />
                  </span>
                  <strong>{item.label}</strong>
                </div>
                <span className="setting-arrow">›</span>
              </div>
            )
          })}

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-icon">
                <Moon size={14} />
              </span>
              <strong>Dark Mode</strong>
            </div>
            <button
              className={`toggle ${state.user.darkMode ? 'active' : ''}`}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  user: { ...current.user, darkMode: !current.user.darkMode },
                }))
              }
            >
              <span />
            </button>
          </div>
        </div>
      </section>

      <button className="logout-button">Logout</button>
    </main>
  )
}

function MetricCard({ label, value, footnote, highlight = false }) {
  return (
    <article className={`metric-card ${highlight ? 'highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{footnote}</p>
    </article>
  )
}

function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id

        return (
          <button
            type="button"
            key={tab.id}
            className={`nav-item ${tab.center ? 'center' : ''} ${active ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span className="nav-icon-wrap">
              <Icon size={tab.center ? 20 : 18} />
            </span>
            {!tab.center || active ? <small>{tab.label}</small> : null}
          </button>
        )
      })}
    </nav>
  )
}

export default App
