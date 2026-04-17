require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  const dbConnected = await connectDB();
  process.env.FAIRSHARE_DATA_MODE = dbConnected ? 'database' : 'memory';
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
})();
