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
const defaultAllowedOrigins = new Set([
  'https://fairshar3.netlify.app',
  'https://www.fairshar3.netlify.app',
]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const isLocalDevOrigin =
        origin &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      const isNetlifyPreview =
        origin &&
        /^https:\/\/[a-z0-9-]+--fairshar3\.netlify\.app$/i.test(origin);

      if (
        !origin ||
        defaultAllowedOrigins.has(origin) ||
        allowedOrigins.includes(origin) ||
        isLocalDevOrigin ||
        isNetlifyPreview
      ) {
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
