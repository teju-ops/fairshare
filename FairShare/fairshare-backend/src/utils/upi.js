const generateUpiLink = ({ upiId, name, amount, note, currency = 'INR' }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: currency,
    tn: note || 'FairShare Settlement',
  });
  return `upi://pay?${params.toString()}`;
};

module.exports = { generateUpiLink };
