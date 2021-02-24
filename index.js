require('dotenv').config();
const express = require('express');
const { promisify } = require('util');
const redis = require('redis');
const { nanoid } = require('nanoid');

const authorizer = require('./autorizer');

const app = express();

const redisClient = redis.createClient();

const getAsyncItem = promisify(redisClient.get).bind(redisClient);
const setAsyncItem = promisify(redisClient.set).bind(redisClient);
const expireTime = 60 * 60 * 24 * 2;

app.get('/create_acc', async (req, res) => {
  try {
    const id = nanoid();
    const status = 'proccesing';
    await setAsyncItem(`buff_acc_cookie_${id}`, JSON.stringify({ status }), 'EX', expireTime);
    authorizer().then((cookie) => {
      setAsyncItem(`buff_acc_cookie_${id}`, JSON.stringify({ status: 'done', data: cookie }), 'EX', expireTime);
    });
    res.status(201).json({ id, status });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'server error' });
  }
});

app.get('/acc_data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getAsyncItem(`buff_acc_cookie_${id}`);
    if (!item) {
      res.status(404).json({ message: 'not found' });
      return;
    }
    res.status(200).json({ id, ...JSON.parse(item) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'server error' });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, '0.0.0.0', () => {
  console.log(`listening at ${port} port`);
});
