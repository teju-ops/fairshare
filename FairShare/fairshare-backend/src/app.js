require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/demo', require('./routes/demo'));

app.get('/health', (_, res) =>
  res.json({
    status: 'ok',
    app: 'FairShare',
    dataMode: process.env.FAIRSHARE_DATA_MODE || 'memory',
  })
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
