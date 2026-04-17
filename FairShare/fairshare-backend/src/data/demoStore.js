const { randomUUID } = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const DemoState = require('../models/DemoState');
const { signToken } = require('../utils/jwt');

const STORE_KEY = 'primary';
const FILE_STORE_PATH = path.join(__dirname, 'demo-store.json');
const CATEGORY_COLORS = {
  Travel: '#ff7e9c',
  Rent: '#ffb1c3',
  Food: '#ffd3dd',
  Shopping: '#ff9d72',
  Utilities: '#cab7ff',
  Fun: '#ffe4a6',
  Other: '#8fe1c2',
};

const nowIso = () => new Date().toISOString();
const round2 = (value) => Number(Number(value || 0).toFixed(2));
const clone = (value) => JSON.parse(JSON.stringify(value));
const sum = (items, selector) => items.reduce((total, item) => total + selector(item), 0);
const isDatabaseReady = () => mongoose.connection.readyState === 1;
const readFileStore = () => {
  try {
    if (!fs.existsSync(FILE_STORE_PATH)) return null;
    return JSON.parse(fs.readFileSync(FILE_STORE_PATH, 'utf8'));
  } catch {
    return null;
  }
};
const writeFileStore = (nextState) => {
  try {
    fs.writeFileSync(FILE_STORE_PATH, JSON.stringify(nextState, null, 2));
  } catch {
    // Keep running even if file persistence fails.
  }
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const seedState = () => ({
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
  paymentMethods: [
    { id: 'pm-1', label: 'PhonePe - HDFC', handle: 'tejumahajan@okaxis', verified: true },
    { id: 'pm-2', label: 'Personal UPI', handle: 'tejumahajan@ybl', verified: true },
  ],
  participants: [
    { id: 'user-1', name: 'Tejaswini', avatar: 'TM', accent: '#ff8ea9' },
    { id: 'user-2', name: 'Rohan', avatar: 'R', accent: '#f0b35c' },
    { id: 'user-3', name: 'Ananya', avatar: 'AN', accent: '#ff5d8f' },
    { id: 'user-4', name: 'Jordan', avatar: 'J', accent: '#d7b49e' },
    { id: 'user-5', name: 'Sam', avatar: 'S', accent: '#9e9e9e' },
    { id: 'user-6', name: 'Taylor', avatar: 'T', accent: '#7b6d68' },
  ],
  groups: [
    {
      id: 'group-1',
      name: 'Munnar Trip',
      status: 'ACTIVE',
      memberIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      category: 'Travel',
    },
    {
      id: 'group-2',
      name: 'Apartment',
      status: 'MONTHLY',
      memberIds: ['user-1', 'user-6'],
      category: 'Rent',
    },
    {
      id: 'group-3',
      name: 'Dinner Party',
      status: 'NEW',
      memberIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      category: 'Food',
    },
  ],
  selectedGroupId: 'group-1',
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
      createdAt: daysAgo(3),
    },
    {
      id: 'exp-2',
      groupId: 'group-1',
      title: 'South Indian Thali',
      amount: 3450,
      paidById: 'user-2',
      participantIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      splitStrategy: 'custom',
      splitInputs: { 'user-1': 860, 'user-2': 900, 'user-3': 845, 'user-4': 845 },
      category: 'Food',
      receipt: null,
      createdAt: daysAgo(2),
    },
    {
      id: 'exp-3',
      groupId: 'group-1',
      title: 'KSRTC Bus Booking',
      amount: 8900,
      paidById: 'user-1',
      participantIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      splitStrategy: 'equal',
      splitInputs: {},
      category: 'Travel',
      receipt: null,
      createdAt: daysAgo(1),
    },
    {
      id: 'exp-4',
      groupId: 'group-2',
      title: 'April Rent',
      amount: 36000,
      paidById: 'user-1',
      participantIds: ['user-1', 'user-6'],
      splitStrategy: 'equal',
      splitInputs: {},
      category: 'Rent',
      receipt: null,
      createdAt: daysAgo(8),
    },
    {
      id: 'exp-5',
      groupId: 'group-2',
      title: 'Electricity Bill',
      amount: 4800,
      paidById: 'user-6',
      participantIds: ['user-1', 'user-6'],
      splitStrategy: 'equal',
      splitInputs: {},
      category: 'Utilities',
      receipt: null,
      createdAt: daysAgo(5),
    },
    {
      id: 'exp-6',
      groupId: 'group-3',
      title: 'Starters and Drinks',
      amount: 5200,
      paidById: 'user-3',
      participantIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      splitStrategy: 'percentage',
      splitInputs: {
        'user-1': 15,
        'user-2': 15,
        'user-3': 20,
        'user-4': 15,
        'user-5': 15,
        'user-6': 20,
      },
      category: 'Food',
      receipt: null,
      createdAt: daysAgo(4),
    },
  ],
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
});

let state = seedState();

const formatCompact = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));

const defaultMemberIds = (currentState) =>
  currentState.participants.slice(0, 2).map((person) => person.id);

const ensureGroupMembers = (group, currentState) => ({
  ...group,
  memberIds:
    Array.isArray(group.memberIds) && group.memberIds.length
      ? group.memberIds
      : defaultMemberIds(currentState),
});

const normalizeLegacyState = (legacyState) => {
  const currentState = clone(seedState());
  const mergedState = {
    ...currentState,
    ...legacyState,
    user: { ...currentState.user, ...(legacyState.user || {}) },
    paymentMethods: legacyState.paymentMethods || currentState.paymentMethods,
    participants: (legacyState.participants || currentState.participants).map((person) => ({
      ...person,
      accent: person.accent || '#ff8ea9',
      avatar:
        person.avatar ||
        String(person.name || 'FS')
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
    })),
  };

  if (Array.isArray(legacyState.groups) && legacyState.groups.length) {
    mergedState.groups = legacyState.groups.map((group, index) =>
      ensureGroupMembers(
        {
          id: group.id || `group-${index + 1}`,
          name: group.name || `Group ${index + 1}`,
          status: group.status || 'ACTIVE',
          category: group.category || currentState.groups[index]?.category || 'Other',
          memberIds:
            group.memberIds ||
            currentState.groups.find((seedGroup) => seedGroup.id === group.id)?.memberIds ||
            currentState.groups[index]?.memberIds,
        },
        mergedState
      )
    );
  }

  if (Array.isArray(legacyState.expenses)) {
    mergedState.expenses = legacyState.expenses;
  } else if (legacyState.trip?.recentExpenses?.length) {
    mergedState.expenses = legacyState.trip.recentExpenses.map((expense, index) => ({
      id: expense.id || `legacy-exp-${index + 1}`,
      groupId: mergedState.groups[0]?.id || 'group-1',
      title: expense.title || 'Untitled Expense',
      amount: Number(expense.amount || 0),
      paidById:
        mergedState.participants.find(
          (person) => person.name.toLowerCase() === String(expense.paidBy || '').toLowerCase()
        )?.id || currentState.user.id,
      participantIds: mergedState.groups[0]?.memberIds || defaultMemberIds(mergedState),
      splitStrategy:
        expense.splitBy === 'percentage'
          ? 'percentage'
          : expense.splitBy === 'custom'
            ? 'custom'
            : 'equal',
      splitInputs: {},
      category: mergedState.groups[0]?.category || 'Other',
      receipt: expense.receipt || null,
      createdAt: expense.createdAt || daysAgo(index),
    }));
  }

  mergedState.selectedGroupId =
    legacyState.selectedGroupId || legacyState.trip?.groupId || mergedState.groups[0]?.id;
  mergedState.addExpenseDefaults = {
    ...currentState.addExpenseDefaults,
    ...(legacyState.addExpenseDefaults || {}),
    aiInsight: {
      ...currentState.addExpenseDefaults.aiInsight,
      ...(legacyState.addExpenseDefaults?.aiInsight || {}),
    },
  };

  if (!Array.isArray(mergedState.expenses) || !mergedState.expenses.length) {
    mergedState.expenses = currentState.expenses;
  }

  mergedState.expenses = mergedState.expenses.filter((expense) => Number(expense.amount || 0) > 0);

  return mergedState;
};

const allocateByWeights = (amount, participantIds, rawWeights) => {
  const safeIds = participantIds.length ? participantIds : ['fallback'];
  const weights = safeIds.map((participantId) => Math.max(0, Number(rawWeights[participantId] || 0)));
  const totalWeight = sum(weights, (weight) => weight);
  const normalizedWeights =
    totalWeight > 0 ? weights : safeIds.map(() => 1);
  const divisor = totalWeight > 0 ? totalWeight : safeIds.length;

  let running = 0;

  return safeIds.reduce((shares, participantId, index) => {
    if (index === safeIds.length - 1) {
      shares[participantId] = round2(amount - running);
      return shares;
    }

    const share = round2((amount * normalizedWeights[index]) / divisor);
    running += share;
    shares[participantId] = share;
    return shares;
  }, {});
};

const computeExpenseDetails = (expense, currentState) => {
  const userId = currentState.user.id;
  const group = currentState.groups.find((item) => item.id === expense.groupId) || currentState.groups[0];
  const participantIds =
    Array.isArray(expense.participantIds) && expense.participantIds.length
      ? [...new Set(expense.participantIds)]
      : [...new Set(group.memberIds)];
  const strategy = expense.splitStrategy || 'equal';
  const amount = round2(expense.amount);

  const shares =
    strategy === 'percentage'
      ? allocateByWeights(amount, participantIds, expense.splitInputs || {})
      : strategy === 'custom'
        ? allocateByWeights(amount, participantIds, expense.splitInputs || {})
        : allocateByWeights(
            amount,
            participantIds,
            participantIds.reduce((memo, participantId) => {
              memo[participantId] = 1;
              return memo;
            }, {})
          );

  const ownShare = round2(shares[userId] || 0);
  const net = expense.paidById === userId ? round2(amount - ownShare) : round2(-ownShare);
  const counterpartBalances = {};

  if (expense.paidById === userId) {
    participantIds.forEach((participantId) => {
      if (participantId !== userId) {
        counterpartBalances[participantId] = round2((counterpartBalances[participantId] || 0) + (shares[participantId] || 0));
      }
    });
  } else if (participantIds.includes(userId)) {
    counterpartBalances[expense.paidById] = round2(
      (counterpartBalances[expense.paidById] || 0) - ownShare
    );
  }

  const paidByName =
    currentState.participants.find((person) => person.id === expense.paidById)?.name ||
    currentState.user.name;

  return {
    ...expense,
    amount,
    shares,
    participantIds,
    groupId: group.id,
    groupName: group.name,
    paidByName,
    splitStrategy: strategy,
    splitBy:
      strategy === 'percentage' ? 'percentage' : strategy === 'custom' ? 'custom' : 'equally',
    net,
    counterpartBalances,
    balanceLabel: net >= 0 ? 'YOU LENT' : 'YOU OWE',
    balanceAmount: round2(Math.abs(net)),
    icon: expense.receipt ? 'receipt' : group.category === 'Food' ? 'utensils' : 'wallet',
    createdAt: expense.createdAt || nowIso(),
  };
};

const buildResponseState = (currentState) => {
  const selectedGroup =
    currentState.groups.find((group) => group.id === currentState.selectedGroupId) ||
    currentState.groups[0];
  const detailedExpenses = currentState.expenses
    .map((expense) => computeExpenseDetails(expense, currentState))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const detailedGroups = currentState.groups.map((group) => {
    const groupExpenses = detailedExpenses.filter((expense) => expense.groupId === group.id);
    const balance = round2(sum(groupExpenses, (expense) => expense.net));

    return {
      ...group,
      members: group.memberIds.length,
      totalSpend: round2(sum(groupExpenses, (expense) => expense.amount)),
      balance,
      avatars: group.memberIds
        .map((memberId) => currentState.participants.find((person) => person.id === memberId)?.avatar)
        .filter(Boolean),
      expenses: groupExpenses,
    };
  });

  const totalOwedToYou = round2(
    sum(detailedExpenses.filter((expense) => expense.net > 0), (expense) => expense.net)
  );
  const totalYouOwe = round2(
    Math.abs(sum(detailedExpenses.filter((expense) => expense.net < 0), (expense) => expense.net))
  );

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 6);
  lastWeekStart.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(lastWeekStart);
  previousWeekStart.setDate(lastWeekStart.getDate() - 7);

  const currentWeekTotal = sum(
    detailedExpenses.filter((expense) => new Date(expense.createdAt) >= lastWeekStart),
    (expense) => expense.amount
  );
  const previousWeekTotal = sum(
    detailedExpenses.filter((expense) => {
      const createdAt = new Date(expense.createdAt);
      return createdAt >= previousWeekStart && createdAt < lastWeekStart;
    }),
    (expense) => expense.amount
  );
  const changeFromLastWeek =
    previousWeekTotal > 0 ? round2(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100) : 100;

  const categoryMap = new Map();
  detailedExpenses.forEach((expense) => {
    const category = expense.category || 'Other';
    categoryMap.set(category, round2((categoryMap.get(category) || 0) + expense.amount));
  });

  const categories = [...categoryMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount]) => ({
      name,
      amount,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
    }));

  const weeklySpend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(now.getDate() - (6 - index));
    const dayKey = day.toDateString();
    return round2(
      sum(
        detailedExpenses.filter((expense) => new Date(expense.createdAt).toDateString() === dayKey),
        (expense) => expense.amount
      )
    );
  });

  const weeklyLabels = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(now.getDate() - (6 - index));
    return day.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase().slice(0, 3);
  });

  const counterpartTotals = {};
  detailedExpenses
    .filter((expense) => expense.groupId === selectedGroup.id)
    .forEach((expense) => {
      Object.entries(expense.counterpartBalances).forEach(([participantId, value]) => {
        counterpartTotals[participantId] = round2((counterpartTotals[participantId] || 0) + value);
      });
    });

  const positiveCounterpart = Object.entries(counterpartTotals).sort((left, right) => right[1] - left[1])[0];
  const settleParticipant = positiveCounterpart
    ? currentState.participants.find((person) => person.id === positiveCounterpart[0])
    : null;

  const selectedGroupExpenses = detailedExpenses.filter((expense) => expense.groupId === selectedGroup.id);
  const totalSpend = round2(sum(detailedExpenses, (expense) => expense.amount));
  const efficiencyScore = Math.max(
    10,
    Math.min(99, Math.round(totalSpend ? ((totalOwedToYou / (totalOwedToYou + totalYouOwe || 1)) * 100) : 94))
  );

  return {
    ...currentState,
    groups: detailedGroups,
    expenses: detailedExpenses,
    currentGroupId: selectedGroup.id,
    overview: {
      totalOwedToYou,
      totalYouOwe,
      changeFromLastWeek,
      pendingSettlements: Object.values(counterpartTotals).filter((value) => Math.abs(value) > 0).length,
    },
    trip: {
      id: selectedGroup.id,
      title: selectedGroup.name,
      totalSpend: round2(sum(selectedGroupExpenses, (expense) => expense.amount)),
      settleSuggestion: settleParticipant
        ? {
            from: settleParticipant.name,
            amount: round2(Math.abs(positiveCounterpart[1])),
            reason: selectedGroupExpenses[0]?.title || 'recent shared expenses',
            note: 'Suggestion: settle the highest balance first for a cleaner split.',
          }
        : {
            from: 'No one',
            amount: 0,
            reason: 'everything is balanced',
            note: 'No pending settlements in this group right now.',
          },
      recentExpenses: selectedGroupExpenses.slice(0, 12),
    },
    analytics: {
      monthLabel: new Date().toLocaleDateString('en-IN', { month: 'long' }),
      totalSpend,
      categories,
      weeklySpend,
      weeklyLabels,
      efficiencyScore,
      topInsights: [
        'AI Smart Insight',
        categories[0]
          ? `${categories[0].name} is your largest spend category at ${formatCompact(categories[0].amount)} this cycle.`
          : 'Start adding expenses to see your patterns.',
      ],
    },
    activity: detailedExpenses.slice(0, 8).map((expense) => ({
      id: expense.id,
      title: expense.title,
      context: expense.groupName,
      amount: expense.net >= 0 ? expense.balanceAmount : -expense.balanceAmount,
      date: new Date(expense.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      tint: expense.net >= 0 ? 'credit' : 'debit',
    })),
    addExpenseDefaults: {
      ...currentState.addExpenseDefaults,
      aiInsight: {
        ...currentState.addExpenseDefaults.aiInsight,
        detectedTotal: currentState.addExpenseDefaults.amount || 0,
      },
    },
    user: {
      ...currentState.user,
      groupsCount: detailedGroups.length,
    },
    meta: {
      appName: 'FairShare',
      backendMode: isDatabaseReady() ? 'database' : 'memory',
      generatedAt: nowIso(),
      totals: {
        groupsSpend: round2(sum(detailedGroups, (group) => group.totalSpend)),
        categorySpend: round2(sum(categories, (category) => category.amount)),
      },
    },
    formatHints: {
      currency: 'INR',
      locale: 'en-IN',
      sample: formatCompact(82480),
    },
  };
};

const readStore = async () => {
  if (!isDatabaseReady()) {
    const fileState = readFileStore();
    if (fileState) {
      state = normalizeLegacyState(fileState);
      return state;
    }

    writeFileStore(state);
    return state;
  }

  const existing = await DemoState.findOne({ key: STORE_KEY }).lean();

  if (!existing) {
    const seeded = seedState();
    await DemoState.create({ key: STORE_KEY, data: seeded });
    state = seeded;
    return seeded;
  }

  state = normalizeLegacyState(existing.data);
  return state;
};

const writeStore = async (nextState) => {
  state = normalizeLegacyState(nextState);
  writeFileStore(state);

  if (!isDatabaseReady()) {
    return state;
  }

  await DemoState.findOneAndUpdate(
    { key: STORE_KEY },
    { $set: { data: state } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return state;
};

const getState = async () => buildResponseState(await readStore());

const registerUser = async (data) => {
  const currentState = clone(await readStore());
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
    notifications: true,
    darkMode: true,
    hideBalances: false,
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
  const currentState = clone(await readStore());
  const groupId = payload.groupId || currentState.selectedGroupId || currentState.groups[0]?.id;
  const group =
    currentState.groups.find((item) => item.id === groupId) || currentState.groups[0];
  const participantIds =
    Array.isArray(payload.participantIds) && payload.participantIds.length
      ? [...new Set(payload.participantIds)]
      : [...new Set(group.memberIds)];

  const expense = {
    id: randomUUID(),
    groupId: group.id,
    title: payload.title?.trim() || 'Untitled Expense',
    amount: round2(payload.amount),
    paidById: payload.paidById || currentState.user.id,
    participantIds,
    splitStrategy: payload.strategy || 'equal',
    splitInputs: payload.splitInputs || {},
    category: payload.category || group.category || 'Other',
    receipt:
      payload.receiptPreview || payload.receiptName
        ? {
            name: payload.receiptName || 'receipt.png',
            preview: payload.receiptPreview || null,
          }
        : null,
    createdAt: payload.createdAt || nowIso(),
  };

  currentState.expenses.unshift(expense);
  currentState.selectedGroupId = group.id;
  currentState.addExpenseDefaults = {
    ...currentState.addExpenseDefaults,
    amount: expense.amount,
    title: expense.title,
    strategy: expense.splitStrategy,
    receiptName: expense.receipt?.name || '',
    receiptPreview: expense.receipt?.preview || null,
    aiInsight: {
      detectedTotal: expense.amount,
      merchants: [expense.title, ...(expense.receipt ? ['Receipt detected'] : [])].slice(0, 2),
      note: `Saved in ${group.name} using ${expense.splitStrategy} split.`,
    },
  };

  await writeStore(currentState);
  return { expense, state: buildResponseState(currentState) };
};

const updateExpense = async (payload) => {
  const currentState = clone(await readStore());
  const index = currentState.expenses.findIndex((expense) => expense.id === payload.id);

  if (index === -1) {
    throw new Error('Expense not found');
  }

  const currentExpense = currentState.expenses[index];
  currentState.expenses[index] = {
    ...currentExpense,
    ...(payload.groupId ? { groupId: payload.groupId } : {}),
    ...(payload.title !== undefined ? { title: payload.title.trim() || 'Untitled Expense' } : {}),
    ...(payload.amount !== undefined ? { amount: round2(payload.amount) } : {}),
    ...(payload.paidById ? { paidById: payload.paidById } : {}),
    ...(Array.isArray(payload.participantIds) && payload.participantIds.length
      ? { participantIds: [...new Set(payload.participantIds)] }
      : {}),
    ...(payload.strategy ? { splitStrategy: payload.strategy } : {}),
    ...(payload.splitInputs ? { splitInputs: payload.splitInputs } : {}),
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.receiptName !== undefined || payload.receiptPreview !== undefined
      ? {
          receipt:
            payload.receiptName || payload.receiptPreview
              ? {
                  name: payload.receiptName || currentExpense.receipt?.name || 'receipt.png',
                  preview: payload.receiptPreview ?? currentExpense.receipt?.preview ?? null,
                }
              : null,
        }
      : {}),
  };

  if (payload.groupId) {
    currentState.selectedGroupId = payload.groupId;
  }

  await writeStore(currentState);
  return buildResponseState(currentState);
};

const updateGroup = async (payload) => {
  const currentState = clone(await readStore());

  if (payload.id) {
    const index = currentState.groups.findIndex((group) => group.id === payload.id);

    if (index === -1) {
      throw new Error('Group not found');
    }

    currentState.groups[index] = ensureGroupMembers(
      {
        ...currentState.groups[index],
        ...(payload.name !== undefined ? { name: payload.name.trim() || 'Untitled Group' } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.category ? { category: payload.category } : {}),
        ...(Array.isArray(payload.memberIds) && payload.memberIds.length
          ? { memberIds: [...new Set(payload.memberIds)] }
          : {}),
      },
      currentState
    );
    currentState.selectedGroupId = payload.id;
  } else {
    const id = randomUUID();
    currentState.groups.unshift(
      ensureGroupMembers(
        {
          id,
          name: payload.name?.trim() || 'New Group',
          status: payload.status || 'ACTIVE',
          category: payload.category || 'Other',
          memberIds:
            Array.isArray(payload.memberIds) && payload.memberIds.length
              ? [...new Set(payload.memberIds)]
              : defaultMemberIds(currentState),
        },
        currentState
      )
    );
    currentState.selectedGroupId = id;
  }

  await writeStore(currentState);
  return buildResponseState(currentState);
};

const updateUser = async (payload) => {
  const currentState = clone(await readStore());

  currentState.user = {
    ...currentState.user,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.upiId !== undefined ? { upiId: payload.upiId } : {}),
    ...(payload.avatar ? { avatar: payload.avatar } : {}),
    ...(payload.notifications !== undefined ? { notifications: payload.notifications } : {}),
    ...(payload.darkMode !== undefined ? { darkMode: payload.darkMode } : {}),
    ...(payload.hideBalances !== undefined ? { hideBalances: payload.hideBalances } : {}),
  };

  await writeStore(currentState);
  return buildResponseState(currentState);
};

const saveParticipant = async (payload) => {
  const currentState = clone(await readStore());
  const name = String(payload.name || '').trim();

  if (!name) {
    throw new Error('Participant name is required');
  }

  const avatar = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (payload.id) {
    const index = currentState.participants.findIndex((participant) => participant.id === payload.id);

    if (index === -1) {
      throw new Error('Participant not found');
    }

    currentState.participants[index] = {
      ...currentState.participants[index],
      name,
      avatar,
      ...(payload.accent ? { accent: payload.accent } : {}),
    };
  } else {
    currentState.participants.push({
      id: randomUUID(),
      name,
      avatar,
      accent: payload.accent || '#ff8ea9',
    });
  }

  await writeStore(currentState);
  return buildResponseState(currentState);
};

const updateSelectedGroup = async (groupId) => {
  const currentState = clone(await readStore());
  const exists = currentState.groups.some((group) => group.id === groupId);

  if (!exists) {
    throw new Error('Group not found');
  }

  currentState.selectedGroupId = groupId;
  await writeStore(currentState);
  return buildResponseState(currentState);
};

const addPaymentMethod = async (payload) => {
  const currentState = clone(await readStore());
  currentState.paymentMethods.unshift({
    id: randomUUID(),
    label: payload.label || 'UPI Account',
    handle: payload.handle || currentState.user.upiId || 'new@upi',
    verified: false,
  });
  await writeStore(currentState);
  return buildResponseState(currentState);
};

module.exports = {
  addExpense,
  addPaymentMethod,
  getState,
  registerUser,
  saveParticipant,
  updateExpense,
  updateGroup,
  updateSelectedGroup,
  updateUser,
};
