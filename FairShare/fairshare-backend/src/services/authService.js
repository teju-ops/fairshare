const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const demoStore = require('../data/demoStore');

const register = async (data) => {
  if (process.env.FAIRSHARE_DATA_MODE === 'memory' || process.env.FAIRSHARE_DEMO_MODE === 'true') {
    return demoStore.registerUser(data);
  }

  const user = await User.create(data);
  return { user, token: signToken(user._id) };
};

module.exports = { register };
