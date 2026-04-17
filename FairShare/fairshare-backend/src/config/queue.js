const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

connection.on('error', (err) => {
  console.warn('Redis unavailable, queues disabled:', err.message);
});

const ocrQueue = new Queue('ocr', { connection });
const settlementQueue = new Queue('settlement', { connection });

module.exports = { connection, ocrQueue, settlementQueue };
