const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const DemoState = require('../models/DemoState');
const { signToken } = require('../utils/jwt');

const now = () => new Date().toISOString();
const STORE_KEY = 'primary';

const seedState = () => ({
  user: {
    id: 'user-1',
    name: 'Tejaswini Mahajan',
    email: 'tejumahajan1008@gmail.com',
    avatar: 'TM',
    upiId: 'tejumahajan@ybl',
    currency: 'INR',
    karma: 2480,
    groupsCount: 12,
    notifications: true,
    darkMode: true,
  },
  paymentMethods: [
    { id: 'pm-1', label: 'PhonePe - HDFC', handle: 'tejumahajan@okaxis', verified: true },
    { id: 'pm-2', label: 'PhonePe - HDFC', handle: 'tejumahajan@ybl', verified: true },
  ],
  participants: [
    { id: 'user-1', name: 'Alex', avatar: 'A', accent: '#ff8ea9', selected: true },
    { id: 'user-2', name: 'Jordan', avatar: 'J', accent: '#d7b49e', selected: true },
    { id: 'user-3', name: 'Sam', avatar: 'S', accent: '#9e9e9e', selected: false },
    { id: 'user-4', name: 'Taylor', avatar: 'T', accent: '#7b6d68', selected: false },
    { id: 'user-5', name: 'Ananya', avatar: 'AN', accent: '#ff5d8f', selected: true },
    { id: 'user-6', name: 'Rohan', avatar: 'R', accent: '#f0b35c', selected: true },
  ],
  groups: [
    {
      id: 'group-1',
      name: 'Munnar Trip',
      members: 4,
      totalSpend: 82480,
      status: 'ACTIVE',
      avatars: ['A', 'R', 'N', 'S'],
    },
    {
      id: 'group-2',
      name: 'Apartment',
      members: 2,
      totalSpend: 65000,
      status: 'MONTHLY',
      avatars: ['T', 'J'],
    },
    {
      id: 'group-3',
      name: 'Dinner Party',
      members: 6,
      totalSpend: 12000,
      status: 'NEW',
      avatars: ['D', 'P', 'K'],
    },
  ],
  overview: {
    totalOwedToYou: 42000,
    totalYouOwe: 8800,
    changeFromLastWeek: 12,
    pendingSettlements: 3,
  },
  trip: {
    title: 'Munnar Trip',
    totalSpend: 82480,
    settleSuggestion: {
      from: 'Ananya',
      amount: 1250,
      reason: 'Train Tickets to Sakleshpur',
      note: 'Suggestion: Settle via UPI for instant balance.',
    },
    recentExpenses: [
      { id: 'exp-1', title: 'Resort in Munnar', amount: 14200, paidBy: 'You', splitBy: 'equally', balanceLabel: 'YOU LENT', balanceAmount: 11360, icon: 'bed' },
      { id: 'exp-2', title: 'South Indian Thali', amount: 3450, paidBy: 'Rohan', splitBy: 'weight', balanceLabel: 'YOU OWE', balanceAmount: 860, icon: 'utensils' },
      { id: 'exp-3', title: 'KSRTC Bus Booking', amount: 8900, paidBy: 'You', splitBy: 'equally', balanceLabel: 'YOU LENT', balanceAmount: 7120, icon: 'wallet' },
    ],
  },
  analytics: {
    monthLabel: 'July',
    totalSpend: 342440,
    categories: [
      { name: 'Travel', amount: 147200, color: '#ff7e9c' },
      { name: 'Fun', amount: 96000, color: '#ffb1c3' },
      { name: 'Food', amount: 99240, color: '#ffd3dd' },
    ],
    weeklySpend: [11000, 24000, 18000, 32000, 26000, 16000, 19000],
    efficiencyScore: 94,
    topInsights: [
      'AI Smart Insight',
      'You spent 15% more on travel this month compared to June.',
    ],
  },
  activity: [
    { id: 'act-1', title: 'Indian Restaurant', context: 'Munnar Trip', amount: -5600, date: 'Fri 7 Aug', tint: 'debit' },
    { id: 'act-2', title: 'Shared Apartment', context: 'Apartment', amount: 8000, date: 'Thu 1 Aug', tint: 'credit' },
    { id: 'act-3', title: 'Train Tickets to Sakleshpur', context: 'Munnar Trip', amount: -8960, date: 'Mon 29 Jul', tint: 'debit' },
  ],
  addExpenseDefaults: {
    amount: 0,
    title: '',
    strategy: 'equal',
    scanReady: true,
    aiInsight: {
      detectedTotal: 2450,
      merchants: ['Masala Dosa', 'Filter Coffee'],
      note: 'AI insights are ready once a receipt is added.',
    },
  },
});

let state = seedState();

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

const sum = (items, selector) => items.reduce((total, item) => total + selector(item), 0);
const cloneState = (value) => JSON.parse(JSON.stringify(value));
const isDatabaseReady = () => mongoose.connection.readyState === 1;

const readStore = async () => {
  if (!isDatabaseReady()) {
    return state;
  }

  const existing = await DemoState.findOne({ key: STORE_KEY }).lean();

  if (!existing) {
    const seeded = seedState();
    await DemoState.create({ key: STORE_KEY, data: seeded });
    state = seeded;
    return seeded;
  }

  state = existing.data;
  return state;
};

const writeStore = async (nextState) => {
  state = nextState;

  if (!isDatabaseReady()) {
    return state;
  }

  await DemoState.findOneAndUpdate(
    { key: STORE_KEY },
    { $set: { data: nextState } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return state;
};

const buildResponseState = (currentState) => {
  const groupTotal = sum(currentState.groups, (group) => group.totalSpend);
  const categoryTotal = sum(currentState.analytics.categories, (category) => category.amount);

  return {
    ...currentState,
    meta: {
      appName: 'FairShare',
      backendMode: isDatabaseReady() ? 'database' : 'memory',
      generatedAt: now(),
      totals: {
        groupsSpend: groupTotal,
        categorySpend: categoryTotal,
      },
    },
    formatHints: {
      currency: 'INR',
      locale: 'en-IN',
      sample: formatCurrency(82480),
    },
  };
};

const getState = async () => {
  const currentState = await readStore();
  return buildResponseState(currentState);
};

const registerUser = async (data) => {
  const currentState = cloneState(await readStore());
  const user = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    avatar: (data.name || 'FS')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    upiId: data.upiId || null,
    currency: 'INR',
    karma: 0,
    groupsCount: 0,
    notifications: true,
    darkMode: true,
  };

  currentState.user = { ...currentState.user, ...user };
  await writeStore(currentState);

  return {
    user,
    token: signToken(user.id),
    mode: isDatabaseReady() ? 'database' : 'memory',
  };
};

const addExpense = async (payload) => {
  const currentState = cloneState(await readStore());
  const amount = Number(payload.amount || 0);
  const participantIds = Array.isArray(payload.participantIds)
    ? payload.participantIds.filter(Boolean)
    : [];
  const splitCount = participantIds.length || 1;
  const share = Number((amount / splitCount).toFixed(2));
  const title = payload.title?.trim() || 'Untitled Expense';

  const expense = {
    id: randomUUID(),
    title,
    amount,
    paidBy: payload.paidBy || 'You',
    splitBy:
      payload.strategy === 'percentage'
        ? 'percentage'
        : payload.strategy === 'custom'
          ? 'custom'
          : 'equally',
    balanceLabel: 'YOU LENT',
    balanceAmount: Number((amount - share).toFixed(2)),
    icon: payload.receiptName ? 'receipt' : 'wallet',
    createdAt: now(),
  };

  currentState.trip.recentExpenses = [expense, ...currentState.trip.recentExpenses].slice(0, 6);
  currentState.trip.totalSpend = Number((currentState.trip.totalSpend + amount).toFixed(2));
  currentState.groups = currentState.groups.map((group) =>
    group.id === 'group-1'
      ? { ...group, totalSpend: Number((group.totalSpend + amount).toFixed(2)) }
      : group
  );

  currentState.activity = [
    {
      id: `act-${Date.now()}`,
      title,
      context: currentState.trip.title,
      amount: -amount,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      tint: 'debit',
    },
    ...currentState.activity,
  ].slice(0, 6);

  currentState.overview.totalYouOwe = Number((currentState.overview.totalYouOwe + share).toFixed(2));
  currentState.analytics.totalSpend = Number((currentState.analytics.totalSpend + amount).toFixed(2));
  currentState.analytics.categories[2].amount = Number(
    (currentState.analytics.categories[2].amount + amount).toFixed(2)
  );
  currentState.addExpenseDefaults = {
    ...currentState.addExpenseDefaults,
    amount,
    title,
    strategy: payload.strategy || 'equal',
    aiInsight: {
      detectedTotal: amount || currentState.addExpenseDefaults.aiInsight.detectedTotal,
      merchants: [title, ...(payload.receiptName ? ['Receipt parsed'] : [])].slice(0, 2),
      note: participantIds.length
        ? `Split between ${participantIds.length} people with a ${payload.strategy || 'equal'} strategy.`
        : 'Expense saved without selected participants.',
    },
  };

  await writeStore(currentState);

  return {
    expense,
    share,
    participantIds,
    state: buildResponseState(currentState),
  };
};

module.exports = {
  addExpense,
  getState,
  registerUser,
};
