const calculateSplits = (amount, strategy, members) => {
  const share = parseFloat((amount / members.length).toFixed(2));
  return members.map(user => ({ user, amount: share }));
};

module.exports = { calculateSplits };
