const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

const currencyDate = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

const seed = () => ({
  user: {
    id: 'user-1',
    name: 'Tejaswini Mahajan',
    email: 'tejumahajan1008@gmail.com',
    avatar: 'TM',
    upiId: 'tejumahajan@ybl',
    currency: 'INR',
    karma: 2480,
    notifications: true,
    darkMode: true,
    hideBalances: false,
  },
  participants: [
    { id: 'user-1', name: 'Tejaswini', avatar: 'TM', accent: '#ff8ea9' },
    { id: 'user-2', name: 'Rohan', avatar: 'R', accent: '#f0b35c' },
    { id: 'user-3', name: 'Ananya', avatar: 'AN', accent: '#ff5d8f' },
    { id: 'user-4', name: 'Jordan', avatar: 'J', accent: '#d7b49e' },
  ],
  paymentMethods: [
    { id: 'pm-1', label: 'PhonePe - HDFC', handle: 'tejumahajan@okaxis', verified: true },
  ],
  currentGroupId: 'group-1',
  groups: [
    {
      id: 'group-1',
      name: 'Munnar Trip',
      status: 'ACTIVE',
      category: 'Travel',
      memberIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    },
    {
      id: 'group-2',
      name: 'Apartment',
      status: 'MONTHLY',
      category: 'Rent',
      memberIds: ['user-1', 'user-2'],
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      groupId: 'group-1',
      title: 'Resort in Munnar',
      amount: 14200,
      paidById: 'user-1',
      participantIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      splitStrategy: 'equal',
      splitInputs: {},
      category: 'Travel',
      receipt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp-2',
      groupId: 'group-2',
      title: 'April Rent',
      amount: 36000,
      paidById: 'user-1',
      participantIds: ['user-1', 'user-2'],
      splitStrategy: 'equal',
      splitInputs: {},
      category: 'Rent',
      receipt: null,
      createdAt: new Date().toISOString(),
    },
  ],
})

let appState = seed()

const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0)
const round = (value) => Number(Number(value || 0).toFixed(2))

const participantName = (id) =>
  appState.participants.find((person) => person.id === id)?.name || 'You'

const computeShare = (expense, participantId) => {
  const ids = expense.participantIds?.length ? expense.participantIds : ['user-1']
  if (expense.splitStrategy === 'custom' && expense.splitInputs?.[participantId]) {
    return Number(expense.splitInputs[participantId])
  }
  if (expense.splitStrategy === 'percentage' && expense.splitInputs?.[participantId]) {
    return round((expense.amount * Number(expense.splitInputs[participantId])) / 100)
  }
  return round(expense.amount / ids.length)
}

const decorate = () => {
  const detailedExpenses = appState.expenses
    .filter((expense) => Number(expense.amount) > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((expense) => {
      const ownShare = computeShare(expense, 'user-1')
      const net = expense.paidById === 'user-1' ? round(expense.amount - ownShare) : -ownShare
      return {
        ...expense,
        amount: round(expense.amount),
        paidByName: participantName(expense.paidById),
        splitBy:
          expense.splitStrategy === 'percentage'
            ? 'percentage'
            : expense.splitStrategy === 'custom'
              ? 'custom'
              : 'equally',
        net,
        balanceLabel: net >= 0 ? 'YOU LENT' : 'YOU OWE',
        balanceAmount: Math.abs(net),
        icon: expense.receipt ? 'receipt' : expense.category === 'Food' ? 'utensils' : 'wallet',
      }
    })

  const groups = appState.groups.map((group) => {
    const expenses = detailedExpenses.filter((expense) => expense.groupId === group.id)
    const totalSpend = round(sum(expenses, (expense) => expense.amount))
    const balance = round(sum(expenses, (expense) => expense.net))
    return {
      ...group,
      members: group.memberIds.length,
      totalSpend,
      balance,
      avatars: group.memberIds
        .map((id) => appState.participants.find((person) => person.id === id)?.avatar)
        .filter(Boolean),
      expenses,
    }
  })

  const currentGroup = groups.find((group) => group.id === appState.currentGroupId) || groups[0]
  const categories = Object.values(
    detailedExpenses.reduce((memo, expense) => {
      const key = expense.category || 'Other'
      memo[key] ||= { name: key, amount: 0, color: key === 'Rent' ? '#ffb1c3' : '#ff7e9c' }
      memo[key].amount = round(memo[key].amount + expense.amount)
      return memo
    }, {})
  )
  const totalOwedToYou = round(sum(detailedExpenses.filter((expense) => expense.net > 0), (expense) => expense.net))
  const totalYouOwe = round(Math.abs(sum(detailedExpenses.filter((expense) => expense.net < 0), (expense) => expense.net)))

  return {
    ...appState,
    groups,
    expenses: detailedExpenses,
    overview: {
      totalOwedToYou,
      totalYouOwe,
      changeFromLastWeek: 100,
      pendingSettlements: detailedExpenses.length,
    },
    trip: {
      id: currentGroup.id,
      title: currentGroup.name,
      totalSpend: currentGroup.totalSpend,
      settleSuggestion: {
        from: currentGroup.balance >= 0 ? 'Group members' : 'You',
        amount: Math.abs(currentGroup.balance),
        reason: currentGroup.expenses[0]?.title || 'shared expenses',
        note: 'Settle the highest balance first for a cleaner split.',
      },
      recentExpenses: currentGroup.expenses,
    },
    analytics: {
      monthLabel: new Date().toLocaleDateString('en-IN', { month: 'long' }),
      totalSpend: round(sum(detailedExpenses, (expense) => expense.amount)),
      categories,
      weeklySpend: [0, 0, 0, 0, 0, 0, round(sum(detailedExpenses, (expense) => expense.amount))],
      weeklyLabels: ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'],
      efficiencyScore: 88,
      topInsights: ['AI Smart Insight', 'Your stats are calculated from saved expenses.'],
    },
    activity: detailedExpenses.slice(0, 8).map((expense) => ({
      id: expense.id,
      title: expense.title,
      context: groups.find((group) => group.id === expense.groupId)?.name || 'Group',
      amount: expense.net >= 0 ? expense.balanceAmount : -expense.balanceAmount,
      date: currencyDate(),
      tint: expense.net >= 0 ? 'credit' : 'debit',
    })),
    addExpenseDefaults: {
      amount: 0,
      title: '',
      strategy: 'equal',
      receiptPreview: null,
      receiptName: '',
      aiInsight: {
        detectedTotal: 0,
        merchants: ['Upload a receipt'],
        note: 'Add a bill image to prefill the split.',
      },
    },
    meta: { backendMode: 'netlify-fallback' },
    user: { ...appState.user, groupsCount: groups.length },
  }
}

const body = async (req) => {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '')

  if (req.method === 'GET' && path === '/demo/state') return json(decorate())

  if (path === '/demo/expenses' && (req.method === 'POST' || req.method === 'PATCH')) {
    const payload = await body(req)
    if (req.method === 'PATCH' && payload.id) {
      appState.expenses = appState.expenses.map((expense) =>
        expense.id === payload.id ? { ...expense, ...payload, splitStrategy: payload.strategy || payload.splitStrategy || expense.splitStrategy } : expense
      )
    } else {
      appState.expenses.unshift({
        id: uid(),
        groupId: payload.groupId || appState.currentGroupId,
        title: payload.title || 'Untitled Expense',
        amount: Number(payload.amount || 0),
        paidById: payload.paidById || 'user-1',
        participantIds: payload.participantIds?.length ? payload.participantIds : ['user-1'],
        splitStrategy: payload.strategy || 'equal',
        splitInputs: payload.splitInputs || {},
        category: payload.category || 'Other',
        receipt:
          payload.receiptName || payload.receiptPreview
            ? { name: payload.receiptName || 'receipt.png', preview: payload.receiptPreview || null }
            : null,
        createdAt: new Date().toISOString(),
      })
    }
    return json({ state: decorate() }, req.method === 'POST' ? 201 : 200)
  }

  if (path === '/demo/user' && req.method === 'PATCH') {
    appState.user = { ...appState.user, ...(await body(req)) }
    return json(decorate())
  }

  if (path === '/demo/groups' && req.method === 'PATCH') {
    const payload = await body(req)
    if (payload.id) {
      appState.groups = appState.groups.map((group) => (group.id === payload.id ? { ...group, ...payload } : group))
      appState.currentGroupId = payload.id
    } else {
      const id = uid()
      appState.groups.unshift({
        id,
        name: payload.name || 'New Group',
        status: payload.status || 'ACTIVE',
        category: payload.category || 'Other',
        memberIds: payload.memberIds?.length ? payload.memberIds : ['user-1'],
      })
      appState.currentGroupId = id
    }
    return json(decorate())
  }

  if (path.startsWith('/demo/groups/select/') && req.method === 'PATCH') {
    appState.currentGroupId = path.split('/').pop()
    return json(decorate())
  }

  if (path === '/demo/participants' && (req.method === 'POST' || req.method === 'PATCH')) {
    const payload = await body(req)
    const name = payload.name || 'New Person'
    const avatar = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    if (payload.id) {
      appState.participants = appState.participants.map((person) =>
        person.id === payload.id ? { ...person, name, avatar, accent: payload.accent || person.accent } : person
      )
    } else {
      appState.participants.push({ id: uid(), name, avatar, accent: payload.accent || '#ff8ea9' })
    }
    return json(decorate(), req.method === 'POST' ? 201 : 200)
  }

  if (path === '/demo/payment-methods' && req.method === 'POST') {
    const payload = await body(req)
    appState.paymentMethods.unshift({
      id: uid(),
      label: payload.label || 'UPI Account',
      handle: payload.handle || appState.user.upiId || 'new@upi',
      verified: false,
    })
    return json(decorate(), 201)
  }

  return json({ message: 'Not found' }, 404)
}

export const config = {
  path: '/api/*',
}
