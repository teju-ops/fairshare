import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Building2,
  CreditCard,
  Home,
  IndianRupee,
  Moon,
  Pencil,
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
  X,
  Zap,
} from 'lucide-react'
import './App.css'

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://fairshare-backend.onrender.com/api')

const API_BASE = RAW_API_BASE.trim().replace(/\s+/g, '')

const tabs = [
  { id: 'overview', label: 'HOME', icon: Home },
  { id: 'groups', label: 'GROUPS', icon: Users },
  { id: 'add', label: 'ADD', icon: Plus, center: true },
  { id: 'analytics', label: 'STATS', icon: TrendingUp },
  { id: 'profile', label: 'PROFILE', icon: User },
]

const categories = ['Travel', 'Rent', 'Food', 'Utilities', 'Shopping', 'Fun', 'Other']

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0))

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0))

const iconMap = {
  wallet: CreditCard,
  utensils: Utensils,
  receipt: Receipt,
}

const money = (value, hidden) => (hidden ? 'Hidden' : currency(value))
const EXPENSE_DRAFT_KEY = 'fairshare-expense-draft'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function detectReceiptAmount(name) {
  const match = String(name || '').match(/(\d+(?:\.\d{1,2})?)/)
  return match ? Number(match[1]) : null
}

function inferReceiptTitle(name) {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function extractReceiptData(file, fallbackName) {
  const fallback = {
    amount: detectReceiptAmount(fallbackName),
    title: inferReceiptTitle(fallbackName),
  }

  if (!file) return fallback

  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    const result = await worker.recognize(file)
    await worker.terminate()

    const text = result.data.text || ''
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const numericMatches = [...text.matchAll(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi)]
      .map((match) => Number(String(match[1]).replace(/,/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0 && value < 1000000)
    const titleLine = lines.find((line) => /[a-z]/i.test(line) && !/^\d/.test(line))

    return {
      amount: numericMatches.length ? Math.max(...numericMatches) : fallback.amount,
      title: titleLine || fallback.title,
    }
  } catch {
    return fallback
  }
}

function blankSplitInputs(ids) {
  return ids.reduce((memo, id) => {
    memo[id] = ''
    return memo
  }, {})
}

function buildExpenseForm(state, expense) {
  const activeGroup = state.groups.find((group) => group.id === state.currentGroupId) || state.groups[0]
  const participantIds = expense?.participantIds || activeGroup?.memberIds || []

  return {
    id: expense?.id || null,
    groupId: expense?.groupId || activeGroup?.id || '',
    amount: expense ? String(expense.amount) : '0.00',
    title: expense?.title || '',
    category: expense?.category || activeGroup?.category || 'Other',
    strategy: expense?.splitStrategy || 'equal',
    paidById: expense?.paidById || state.user.id,
    participantIds,
    receiptName: expense?.receipt?.name || '',
    receiptPreview: expense?.receipt?.preview || null,
    receiptFile: null,
    splitInputs: expense?.splitInputs || blankSplitInputs(participantIds),
  }
}

function buildGroupForm(group = null) {
  return {
    id: group?.id || null,
    name: group?.name || '',
    status: group?.status || 'ACTIVE',
    category: group?.category || 'Other',
    memberIds: group?.memberIds || [],
  }
}

function buildParticipantForm(participant = null) {
  return {
    id: participant?.id || null,
    name: participant?.name || '',
    accent: participant?.accent || '#ff8ea9',
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [appState, setAppState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [sheet, setSheet] = useState(null)
  const [expenseForm, setExpenseForm] = useState(null)
  const [groupForm, setGroupForm] = useState(buildGroupForm())
  const [participantForm, setParticipantForm] = useState(buildParticipantForm())
  const [profileForm, setProfileForm] = useState({ name: '', email: '', upiId: '' })
  const [paymentForm, setPaymentForm] = useState({ label: '', handle: '' })
  const receiptInputRef = useRef(null)

  const applyLoadedState = (data) => {
    setAppState(data)
    setProfileForm({
      name: data.user.name,
      email: data.user.email,
      upiId: data.user.upiId || '',
    })
    setPaymentForm({
      label: 'UPI Account',
      handle: data.user.upiId || '',
    })
    setExpenseForm((current) => {
      if (current?.id) {
        const updatedExpense = data.expenses.find((expense) => expense.id === current.id)
        return updatedExpense ? buildExpenseForm(data, updatedExpense) : buildExpenseForm(data)
      }

      try {
        const rawDraft = window.localStorage.getItem(EXPENSE_DRAFT_KEY)
        if (rawDraft) {
          const draft = JSON.parse(rawDraft)
          const safeParticipantIds = (draft.participantIds || []).filter((id) =>
            data.participants.some((person) => person.id === id)
          )
          return {
            ...buildExpenseForm(data),
            ...draft,
            participantIds: safeParticipantIds.length ? safeParticipantIds : buildExpenseForm(data).participantIds,
            splitInputs: {
              ...blankSplitInputs(safeParticipantIds.length ? safeParticipantIds : buildExpenseForm(data).participantIds),
              ...(draft.splitInputs || {}),
            },
          }
        }
      } catch {
        // Ignore draft restore issues and fall back to fresh state.
      }

      return buildExpenseForm(data)
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadState = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/demo/state`)
        if (!response.ok) throw new Error('Unable to load FairShare data.')
        const data = await response.json()
        if (!cancelled) {
          applyLoadedState(data)
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message)
      } finally {
        if (!cancelled) setLoading(false)
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

  useEffect(() => {
    if (appState) document.documentElement.dataset.theme = appState.user.darkMode ? 'dark' : 'light'
  }, [appState])

  useEffect(() => {
    if (!expenseForm || expenseForm.id) return

    try {
      window.localStorage.setItem(
        EXPENSE_DRAFT_KEY,
        JSON.stringify({
          groupId: expenseForm.groupId,
          amount: expenseForm.amount,
          title: expenseForm.title,
          category: expenseForm.category,
          strategy: expenseForm.strategy,
          paidById: expenseForm.paidById,
          participantIds: expenseForm.participantIds,
          receiptName: expenseForm.receiptName,
          receiptPreview: expenseForm.receiptPreview,
          splitInputs: expenseForm.splitInputs,
        })
      )
    } catch {
      // Ignore local draft write failures.
    }
  }, [expenseForm])

  const hiddenBalances = appState?.user.hideBalances
  const selectedGroup = useMemo(
    () => appState?.groups?.find((group) => group.id === appState.currentGroupId) || appState?.groups?.[0],
    [appState]
  )
  const selectedParticipants = useMemo(() => {
    if (!appState || !expenseForm) return []
    return appState.participants.filter((person) => expenseForm.participantIds.includes(person.id))
  }, [appState, expenseForm])

  if (loading || !expenseForm) return <LoadingState />

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

  const updateRemoteState = async (path, method, payload, successMessage) => {
    try {
      setSaving(true)
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      })
      if (!response.ok) throw new Error('Could not save your changes.')
      const data = await response.json()
      applyLoadedState(data.state || data)
      setToast(successMessage)
      return data
    } catch (requestError) {
      setToast(requestError.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const openGroupEditor = (group) => {
    setGroupForm(buildGroupForm(group))
    setSheet('group')
  }

  const openParticipantEditor = (participant = null) => {
    setParticipantForm(buildParticipantForm(participant))
    setSheet('participant')
  }

  const openExpenseEditor = (expense) => {
    setExpenseForm(buildExpenseForm(appState, expense))
    setActiveTab('add')
  }

  const handleGroupSelect = async (groupId) => {
    await updateRemoteState(`/demo/groups/select/${groupId}`, 'PATCH', {}, 'Group selected')
  }

  const handleParticipantToggle = (participantId) => {
    setExpenseForm((current) => {
      const participantIds = current.participantIds.includes(participantId)
        ? current.participantIds.filter((id) => id !== participantId)
        : [...current.participantIds, participantId]

      return {
        ...current,
        participantIds,
        splitInputs: {
          ...blankSplitInputs(participantIds),
          ...current.splitInputs,
        },
      }
    })
  }

  const handleSelectAll = () => {
    const allSelected = expenseForm.participantIds.length === appState.participants.length
    const participantIds = allSelected ? [] : appState.participants.map((person) => person.id)
    setExpenseForm((current) => ({
      ...current,
      participantIds,
      splitInputs: {
        ...blankSplitInputs(participantIds),
        ...current.splitInputs,
      },
    }))
  }

  const handleGroupChangeForExpense = (groupId) => {
    const group = appState.groups.find((item) => item.id === groupId)
    if (!group) return
    setExpenseForm((current) => ({
      ...current,
      groupId,
      category: current.category || group.category,
      participantIds: group.memberIds,
      splitInputs: blankSplitInputs(group.memberIds),
    }))
  }

  const handleReceiptPick = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const preview = await fileToDataUrl(file)
    const receiptData = await extractReceiptData(file, file.name)

    setExpenseForm((current) => ({
      ...current,
      receiptName: file.name,
      receiptPreview: preview,
      receiptFile: file,
      amount: current.amount === '0.00' && receiptData.amount ? String(receiptData.amount) : current.amount,
      title: current.title || receiptData.title,
    }))
    setToast(receiptData.amount ? 'Receipt scanned and amount filled' : 'Receipt added')
  }

  const handleScanReceipt = () => {
    extractReceiptData(expenseForm.receiptFile, expenseForm.receiptName).then((receiptData) => {
      setExpenseForm((current) => ({
        ...current,
        amount: receiptData.amount ? String(receiptData.amount) : current.amount,
        title: receiptData.title || current.title,
      }))
      setToast(receiptData.amount ? 'Receipt rescanned' : 'No amount found on receipt')
    })
  }

  const handleTogglePreference = async (key) => {
    await updateRemoteState('/demo/user', 'PATCH', { [key]: !appState.user[key] }, 'Settings updated')
  }

  const handleProfileSave = async () => {
    const updated = await updateRemoteState('/demo/user', 'PATCH', profileForm, 'Profile updated')
    if (updated) setSheet(null)
  }

  const handlePaymentSave = async () => {
    const updated = await updateRemoteState('/demo/payment-methods', 'POST', paymentForm, 'Payment method added')
    if (updated) setSheet(null)
  }

  const handleParticipantSave = async () => {
    const updated = await updateRemoteState(
      '/demo/participants',
      participantForm.id ? 'PATCH' : 'POST',
      participantForm,
      participantForm.id ? 'Person updated' : 'Person added'
    )

    if (updated) setSheet(null)
  }

  const handleGroupSave = async () => {
    const updated = await updateRemoteState('/demo/groups', 'PATCH', groupForm, 'Group updated')
    if (updated) setSheet(null)
  }

  const handleSplitInputChange = (participantId, value) => {
    setExpenseForm((current) => ({
      ...current,
      splitInputs: {
        ...current.splitInputs,
        [participantId]: value,
      },
    }))
  }

  const handleSaveExpense = async () => {
    const payload = {
      id: expenseForm.id,
      groupId: expenseForm.groupId,
      amount: Number(expenseForm.amount || 0),
      title: expenseForm.title,
      category: expenseForm.category,
      strategy: expenseForm.strategy,
      paidById: expenseForm.paidById,
      receiptName: expenseForm.receiptName,
      receiptPreview: expenseForm.receiptPreview,
      participantIds: expenseForm.participantIds,
      splitInputs: Object.fromEntries(
        Object.entries(expenseForm.splitInputs || {}).map(([key, value]) => [key, Number(value || 0)])
      ),
    }

    const updated = await updateRemoteState(
      '/demo/expenses',
      expenseForm.id ? 'PATCH' : 'POST',
      payload,
      expenseForm.id ? 'Expense updated' : 'Expense saved'
    )

    if (!updated) return
    try {
      window.localStorage.removeItem(EXPENSE_DRAFT_KEY)
    } catch {
      // Ignore local draft cleanup failures.
    }
    setExpenseForm(buildExpenseForm(updated.state || updated))
    setActiveTab('groups')
  }

  const splitPreview = (() => {
    if (!expenseForm.participantIds.length) return 'Select participants to preview the split.'
    const amount = Number(expenseForm.amount || 0)
    if (!amount) return 'Enter an amount to see live split values.'
    if (expenseForm.strategy === 'equal') {
      return `Everyone pays ${currency(amount / expenseForm.participantIds.length)}.`
    }

    const total = expenseForm.participantIds.reduce(
      (sum, participantId) => sum + Number(expenseForm.splitInputs[participantId] || 0),
      0
    )

    return expenseForm.strategy === 'percentage'
      ? total
        ? `Percentages total ${total}%.`
        : 'Add percentage values for each participant.'
      : total
        ? `Custom values total ${currency(total)}.`
        : 'Add a custom amount for each participant.'
  })()

  return (
    <div className="app-shell">
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />

      {activeTab === 'overview' && (
        <OverviewScreen
          state={appState}
          hiddenBalances={hiddenBalances}
          onNavigate={setActiveTab}
          onOpenGroup={openGroupEditor}
          onSelectGroup={handleGroupSelect}
        />
      )}

      {activeTab === 'groups' && (
        <GroupsScreen
          state={appState}
          hiddenBalances={hiddenBalances}
          selectedGroup={selectedGroup}
          onSelectGroup={handleGroupSelect}
          onEditGroup={openGroupEditor}
          onEditExpense={openExpenseEditor}
          onEditPerson={openParticipantEditor}
        />
      )}

      {activeTab === 'add' && (
        <AddExpenseScreen
          state={appState}
          hiddenBalances={hiddenBalances}
          form={expenseForm}
          saving={saving}
          splitPreview={splitPreview}
          selectedParticipants={selectedParticipants}
          receiptInputRef={receiptInputRef}
          onFormChange={setExpenseForm}
          onGroupChange={handleGroupChangeForExpense}
          onParticipantToggle={handleParticipantToggle}
          onSelectAll={handleSelectAll}
          onSplitInputChange={handleSplitInputChange}
          onReceiptPick={handleReceiptPick}
          onScan={handleScanReceipt}
          onSave={handleSaveExpense}
          onBack={() => {
            setExpenseForm(buildExpenseForm(appState))
            setActiveTab('groups')
          }}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsScreen state={appState} hiddenBalances={hiddenBalances} onEditExpense={openExpenseEditor} />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          state={appState}
          hiddenBalances={hiddenBalances}
          onOpenAccount={() => setSheet('account')}
          onOpenPayment={() => setSheet('payment')}
          onOpenPeople={() => openParticipantEditor()}
          onTogglePreference={handleTogglePreference}
          onLogout={() => {
            setSheet(null)
            setActiveTab('overview')
            setToast('Local session reset')
          }}
        />
      )}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      {sheet === 'group' && (
        <ModalShell title={groupForm.id ? 'Edit Group' : 'New Group'} onClose={() => setSheet(null)}>
          <FormField label="Group name">
            <input value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="Status">
            <select value={groupForm.status} onChange={(event) => setGroupForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="NEW">NEW</option>
            </select>
          </FormField>
          <FormField label="Category">
            <select value={groupForm.category} onChange={(event) => setGroupForm((current) => ({ ...current, category: event.target.value }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Members">
            <div className="modal-chip-grid">
              {appState.participants.map((participant) => (
                <button
                  type="button"
                  key={participant.id}
                  className={`mini-chip ${groupForm.memberIds.includes(participant.id) ? 'active' : ''}`}
                  onClick={() =>
                    setGroupForm((current) => ({
                      ...current,
                      memberIds: current.memberIds.includes(participant.id)
                        ? current.memberIds.filter((id) => id !== participant.id)
                        : [...current.memberIds, participant.id],
                    }))
                  }
                >
                  {participant.name}
                </button>
              ))}
            </div>
          </FormField>
          <button className="primary-button" disabled={saving} onClick={handleGroupSave}>
            Save Group
          </button>
        </ModalShell>
      )}

      {sheet === 'account' && (
        <ModalShell title="Account Settings" onClose={() => setSheet(null)}>
          <FormField label="Full name">
            <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="Email">
            <input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
          </FormField>
          <FormField label="UPI ID">
            <input value={profileForm.upiId} onChange={(event) => setProfileForm((current) => ({ ...current, upiId: event.target.value }))} />
          </FormField>
          <button className="primary-button" disabled={saving} onClick={handleProfileSave}>
            Save Profile
          </button>
        </ModalShell>
      )}

      {sheet === 'payment' && (
        <ModalShell title="Add Payment Method" onClose={() => setSheet(null)}>
          <FormField label="Label">
            <input value={paymentForm.label} onChange={(event) => setPaymentForm((current) => ({ ...current, label: event.target.value }))} />
          </FormField>
          <FormField label="UPI handle">
            <input value={paymentForm.handle} onChange={(event) => setPaymentForm((current) => ({ ...current, handle: event.target.value }))} />
          </FormField>
          <button className="primary-button" disabled={saving} onClick={handlePaymentSave}>
            Add Method
          </button>
        </ModalShell>
      )}

      {sheet === 'participant' && (
        <ModalShell title={participantForm.id ? 'Edit Person' : 'Add Person'} onClose={() => setSheet(null)}>
          <FormField label="Name">
            <input value={participantForm.name} onChange={(event) => setParticipantForm((current) => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="Accent color">
            <input value={participantForm.accent} onChange={(event) => setParticipantForm((current) => ({ ...current, accent: event.target.value }))} />
          </FormField>
          <button className="primary-button" disabled={saving} onClick={handleParticipantSave}>
            Save Person
          </button>
        </ModalShell>
      )}

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

function TopBar({ title = 'FairShare', back = false, avatar = 'FS', subtitle, onBack, onBell }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {back ? (
          <button className="icon-button muted" aria-label="Back" onClick={onBack}>
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
      <button className="icon-button" aria-label="Actions" onClick={onBell}>
        <Bell size={16} />
      </button>
    </header>
  )
}

function OverviewScreen({ state, hiddenBalances, onNavigate, onOpenGroup, onSelectGroup }) {
  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} onBell={() => onNavigate('profile')} />
      <section className="screen-heading">
        <h1>Overview</h1>
        <p>Editable groups, live balances, and actual totals.</p>
      </section>
      <section className="metric-grid">
        <MetricCard
          label="TOTAL OWED TO YOU"
          value={money(state.overview.totalOwedToYou, hiddenBalances)}
          footnote={`${state.overview.changeFromLastWeek}% vs last week`}
          highlight
        />
        <MetricCard
          label="TOTAL YOU OWE"
          value={money(state.overview.totalYouOwe, hiddenBalances)}
          footnote={`${state.overview.pendingSettlements} pending settlements`}
        />
      </section>
      <section className="section">
        <div className="section-header">
          <div>
            <h2>Groups</h2>
            <p>Tap any group to make it active.</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('groups')}>
            View all
          </button>
        </div>
        <div className="stack">
          {state.groups.map((group) => (
            <article className="group-card interactive-card" key={group.id} onClick={() => onSelectGroup(group.id)}>
              <div className="group-card-header">
                <div className="group-thumb">{group.name[0]}</div>
                <div className="group-header-actions">
                  <span className="pill">{group.status}</span>
                  <button
                    className="icon-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenGroup(group)
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <h3>{group.name}</h3>
              <p>
                {group.members} members / {money(group.totalSpend, hiddenBalances)}
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
          <button className="filter-chip" onClick={() => onNavigate('analytics')}>
            Stats
          </button>
        </div>
        <div className="stack compact">
          {state.activity.map((item) => (
            <article className="activity-row" key={item.id}>
              <div className={`activity-dot ${item.tint}`} />
              <div className="activity-copy">
                <h3>{item.title}</h3>
                <p>
                  {item.context} / {item.date}
                </p>
              </div>
              <strong className={item.tint === 'credit' ? 'positive' : 'negative'}>
                {item.amount > 0 ? '+' : '-'}
                {money(Math.abs(item.amount), hiddenBalances)}
              </strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function GroupsScreen({ state, hiddenBalances, selectedGroup, onSelectGroup, onEditGroup, onEditExpense, onEditPerson }) {
  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} onBell={() => onEditGroup(selectedGroup)} />
      <section className="trip-hero">
        <div className="trip-heading-row">
          <h1>{selectedGroup.name}</h1>
          <button className="icon-button" onClick={() => onEditGroup(selectedGroup)}>
            <Pencil size={16} />
          </button>
        </div>
        <div className="trip-total">
          <span>TOTAL SPEND</span>
          <strong>{money(selectedGroup.totalSpend, hiddenBalances)}</strong>
        </div>
        <div className="trip-members">
          <div className="member-stack">
            {selectedGroup.avatars.map((avatar, index) => (
              <span key={`${avatar}-${index}`} className="member-badge">
                {avatar}
              </span>
            ))}
          </div>
          <button className="member-add" onClick={() => onEditGroup(selectedGroup)}>
            <Users size={14} />
          </button>
        </div>
      </section>
      <section className="settle-card">
        <div className="settle-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h3>{selectedGroup.balance >= 0 ? 'Net lent' : 'Net owed'} {money(Math.abs(selectedGroup.balance), hiddenBalances)}</h3>
          <p>{state.trip.settleSuggestion.from}</p>
          <span>{state.trip.settleSuggestion.note}</span>
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>Your Groups</h2>
          <button className="text-button" onClick={() => onEditGroup()}>
            Add group
          </button>
        </div>
        <div className="stack compact">
          {state.groups.map((group) => (
            <button
              type="button"
              key={group.id}
              className={`group-list-item ${group.id === selectedGroup.id ? 'active' : ''}`}
              onClick={() => onSelectGroup(group.id)}
            >
              <span>{group.name}</span>
              <strong>{money(group.totalSpend, hiddenBalances)}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>People</h2>
          <button className="text-button" onClick={() => onEditPerson()}>
            Add person
          </button>
        </div>
        <div className="stack compact">
          {state.participants.map((person) => (
            <button type="button" key={person.id} className="group-list-item" onClick={() => onEditPerson(person)}>
              <span>{person.name}</span>
              <strong>{person.avatar}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>Expenses</h2>
          <button className="text-button" onClick={() => onEditGroup(selectedGroup)}>
            Edit group
          </button>
        </div>
        <div className="stack">
          {selectedGroup.expenses.map((expense) => {
            const Icon = iconMap[expense.icon] || Wallet
            return (
              <article className="expense-card" key={expense.id}>
                <div className="expense-icon">
                  <Icon size={18} />
                </div>
                <div className="expense-copy">
                  <h3>{expense.title}</h3>
                  <p>
                    Paid by {expense.paidByName} / Split by {expense.splitBy}
                  </p>
                  {expense.receipt ? <small className="receipt-tag">{expense.receipt.name}</small> : null}
                </div>
                <div className="expense-values">
                  <strong>{money(expense.amount, hiddenBalances)}</strong>
                  <span>{expense.balanceLabel}</span>
                  <small>{money(expense.balanceAmount, hiddenBalances)}</small>
                  <button className="mini-action" onClick={() => onEditExpense(expense)}>
                    Edit
                  </button>
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
  state,
  hiddenBalances,
  form,
  saving,
  splitPreview,
  selectedParticipants,
  receiptInputRef,
  onFormChange,
  onGroupChange,
  onParticipantToggle,
  onSelectAll,
  onSplitInputChange,
  onReceiptPick,
  onScan,
  onSave,
  onBack,
}) {
  const allSelected = form.participantIds.length === state.participants.length

  return (
    <main className="screen add-screen">
      <TopBar title="FairShare" avatar={state.user.avatar} back onBack={onBack} onBell={onScan} />
      <section className="amount-panel">
        <p className="eyebrow centered">ENTER AMOUNT</p>
        <div className="amount-display">
          <IndianRupee size={24} />
          <input value={form.amount} onChange={(event) => onFormChange((current) => ({ ...current, amount: event.target.value }))} />
        </div>
      </section>
      <div className="two-col-grid">
        <FormField label="Group">
          <select value={form.groupId} onChange={(event) => onGroupChange(event.target.value)}>
            {state.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Paid by">
          <select value={form.paidById} onChange={(event) => onFormChange((current) => ({ ...current, paidById: event.target.value }))}>
            {state.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <label className="glass-input">
        <span>Expense name</span>
        <input
          placeholder="e.g. Apartment rent, groceries, cab"
          value={form.title}
          onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
        />
      </label>
      <div className="two-col-grid">
        <FormField label="Category">
          <select value={form.category} onChange={(event) => onFormChange((current) => ({ ...current, category: event.target.value }))}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Receipt file name">
          <input value={form.receiptName} placeholder="receipt.png" onChange={(event) => onFormChange((current) => ({ ...current, receiptName: event.target.value }))} />
        </FormField>
      </div>
      <div className="upload-card upload-stack">
        <div className="upload-copy">
          <Upload size={18} />
          <span>{form.receiptName || 'Upload receipt image'}</span>
        </div>
        <div className="upload-actions">
          <button type="button" className="ghost-button" onClick={() => receiptInputRef.current?.click()}>
            Choose file
          </button>
          <button type="button" className="ghost-button" onClick={onScan}>
            Autofill
          </button>
          {form.receiptPreview ? (
            <button type="button" className="ghost-button" onClick={() => onFormChange((current) => ({ ...current, receiptName: '', receiptPreview: null, receiptFile: null }))}>
              Remove
            </button>
          ) : null}
        </div>
        <input ref={receiptInputRef} className="hidden-input" type="file" accept="image/*" onChange={onReceiptPick} />
        {form.receiptPreview ? <img className="receipt-preview" src={form.receiptPreview} alt={form.receiptName} /> : null}
      </div>
      <section className="insight-card">
        <div className="section-header compact-header">
          <span className="eyebrow">AI INSIGHTS</span>
          <Sparkles size={14} />
        </div>
        <p className="tiny-copy">Detected Total</p>
        <div className="insight-grid">
          <strong>{money(form.amount || 0, hiddenBalances)}</strong>
          <div>
            <p className="tiny-copy">Detected title</p>
            <span>{form.title || 'Waiting for receipt or manual edit'}</span>
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
        <p className="helper-copy">{splitPreview}</p>
        {form.strategy !== 'equal' ? (
          <div className="split-editor">
            {selectedParticipants.map((participant) => (
              <label className="split-row" key={participant.id}>
                <span>{participant.name}</span>
                <input
                  type="number"
                  value={form.splitInputs?.[participant.id] || ''}
                  placeholder={form.strategy === 'percentage' ? '%' : 'Amount'}
                  onChange={(event) => onSplitInputChange(participant.id, event.target.value)}
                />
              </label>
            ))}
          </div>
        ) : null}
      </section>
      <button className="primary-button bottom-cta" disabled={saving} onClick={onSave}>
        {saving ? 'Saving...' : form.id ? 'Update Expense' : 'Save Expense'}
      </button>
    </main>
  )
}

function AnalyticsScreen({ state, hiddenBalances, onEditExpense }) {
  const highestSpend = Math.max(...state.analytics.weeklySpend, 1)
  const totalCategorySpend = state.analytics.categories.reduce((sum, category) => sum + category.amount, 0)

  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} onBell={() => onEditExpense(state.expenses[0])} />
      <section className="screen-heading">
        <h1>Analytics</h1>
        <p>Your charts are built from the saved expenses now.</p>
      </section>
      <section className="smart-card">
        <Sparkles size={16} />
        <h3>{state.analytics.topInsights[0]}</h3>
        <p>{state.analytics.topInsights[1]}</p>
        <button className="pill-button" onClick={() => onEditExpense(state.expenses[0])}>
          Review latest
        </button>
      </section>
      <section className="chart-card">
        <div className="section-header compact-header">
          <div>
            <span className="tiny-copy">TOTAL SPEND</span>
            <h2>{money(state.analytics.totalSpend, hiddenBalances)}</h2>
          </div>
          <div className="segmented">
            <span className="active">7 Days</span>
            <span>{state.analytics.monthLabel}</span>
          </div>
        </div>
        <div className="bar-chart">
          {state.analytics.weeklySpend.map((value, index) => (
            <div className="bar-column" key={`${value}-${index}`}>
              <div className={`bar ${value === highestSpend ? 'highlight' : ''}`} style={{ height: `${(value / highestSpend) * 100}%` }} />
              <span>{state.analytics.weeklyLabels[index]}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="chart-card">
        <span className="tiny-copy">BY CATEGORY</span>
        <div className="distribution-layout">
          <div className="donut-chart" style={{ background: `conic-gradient(${buildCategoryGradient(state.analytics.categories)})` }}>
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
                <strong>{money(category.amount, hiddenBalances)}</strong>
              </div>
            ))}
            <p className="tiny-copy">Tracked total: {compactCurrency(totalCategorySpend)}</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>Top Groups</h2>
        </div>
        <div className="stack compact">
          {state.groups.map((group) => (
            <article className="activity-row insight-row" key={group.id}>
              <div className="expense-icon">
                {group.category === 'Rent' ? <Building2 size={16} /> : <Wallet size={16} />}
              </div>
              <div className="activity-copy">
                <h3>{group.name}</h3>
                <p>
                  {group.members} members / {group.category}
                </p>
              </div>
              <strong>{money(group.totalSpend, hiddenBalances)}</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="score-card">
        <span className="eyebrow">EFFICIENCY SCORE</span>
        <strong>{state.analytics.efficiencyScore}%</strong>
        <p>Based on how much of your tracked balance is currently recoverable.</p>
      </section>
    </main>
  )
}

function ProfileScreen({ state, hiddenBalances, onOpenAccount, onTogglePreference, onOpenPayment, onOpenPeople, onLogout }) {
  return (
    <main className="screen">
      <TopBar title="FairShare" avatar={state.user.avatar} onBell={onOpenAccount} />
      <section className="profile-card">
        <div className="profile-avatar">{state.user.avatar}</div>
        <h1>{state.user.name}</h1>
        <p>{state.user.email}</p>
        <div className="profile-stats">
          <div>
            <span>KARMA</span>
            <strong>{money(state.user.karma, hiddenBalances)}</strong>
          </div>
          <div>
            <span>GROUPS</span>
            <strong>{state.user.groupsCount}</strong>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>Saved Payment Methods</h2>
          <button className="text-button" onClick={onOpenPayment}>
            Add new
          </button>
        </div>
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
          <button className="primary-button" onClick={onOpenPayment}>
            <Zap size={16} />
            Pay via UPI
          </button>
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2>People</h2>
          <button className="text-button" onClick={onOpenPeople}>
            Manage
          </button>
        </div>
        <div className="payment-card">
          {state.participants.slice(0, 5).map((person) => (
            <div className="payment-row" key={person.id}>
              <div className="payment-icon">{person.avatar}</div>
              <div className="activity-copy">
                <h3>{person.name}</h3>
                <p>Tap Manage to rename or add people</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Settings</h2>
        <div className="settings-card">
          <button className="setting-row interactive-row" onClick={onOpenAccount}>
            <div className="setting-label">
              <span className="setting-icon">
                <User size={14} />
              </span>
              <strong>Account Settings</strong>
            </div>
            <span className="setting-arrow">{'>'}</span>
          </button>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-icon">
                <Bell size={14} />
              </span>
              <strong>Notifications</strong>
            </div>
            <button className={`toggle ${state.user.notifications ? 'active' : ''}`} onClick={() => onTogglePreference('notifications')}>
              <span />
            </button>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-icon">
                <Shield size={14} />
              </span>
              <strong>Hide Balances</strong>
            </div>
            <button className={`toggle ${state.user.hideBalances ? 'active' : ''}`} onClick={() => onTogglePreference('hideBalances')}>
              <span />
            </button>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-icon">
                <Moon size={14} />
              </span>
              <strong>Dark Mode</strong>
            </div>
            <button className={`toggle ${state.user.darkMode ? 'active' : ''}`} onClick={() => onTogglePreference('darkMode')}>
              <span />
            </button>
          </div>
        </div>
      </section>
      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </main>
  )
}

function buildCategoryGradient(categoriesList) {
  if (!categoriesList.length) return '#ff7e9c 0deg 360deg'
  const total = categoriesList.reduce((sum, category) => sum + category.amount, 0) || 1
  let start = 0
  return categoriesList
    .map((category) => {
      const sweep = (category.amount / total) * 360
      const stop = start + sweep
      const segment = `${category.color} ${start}deg ${stop}deg`
      start = stop
      return segment
    })
    .join(', ')
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      {children}
    </label>
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
