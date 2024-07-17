const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get('/', async (req, res) => {
  res.send('financial service server site is run ');
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqe77mp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const database = client.db('Financial-Service');
    const userCollections = database.collection('User');
    const transactionCollections = database.collection('Transactions');

    app.post('/jwt', async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d',
      });

      res.send({ token });
    });

    //verfiy token-------------
    // const verifyToken = (req, res, next) => {
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: 'forbidden acces' });
    //   }
    //   const token = req.headers.authorization.split(' ')[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    //     if (err) {
    //       return res.status(401).send({ message: 'forbidden access' });
    //     }

    //     req.decode = decode;

    //     next();
    //   });
    // };

    // await client.db('admin').command({ ping: 1 });

    app.post('/user', async (req, res) => {
      const user = req.body;
      const password = bcrypt.hashSync(user.password, 14);
      const userInfo = {
        name: user?.fullName,
        password,
        email: user?.email,
        image: user?.image,
        number: user?.number,
        role: user?.role,
        status: user?.status,
        balance: user?.balance,
      };
      const qurey = { email: user?.email };
      const isExist = await userCollections.findOne(qurey);
      if (!isExist) {
        const result = await userCollections.insertOne(userInfo);
        res.send(result);
      } else {
        return res.send('User alredy exist');
      }
    });

    app.get('/login', async (req, res) => {
      const email = req.query.email;
      const password = req.query.password;

      const currentUser = await userCollections.findOne({ email: email });
      const hxpassword = bcrypt.compareSync(password, currentUser.password);

      if (!hxpassword) {
        return res.send({
          message: 'Your email and password invalid. Please try again',
        });
      } else {
        res.send({ user: currentUser });
      }
    });

    app.get('/users', async (req, res) => {
      const qurey = { email: req.query.email };
      const result = await userCollections.findOne(qurey);
      res.send(result);
    });

    app.post('/send-money', async (req, res) => {
      const userInfo = req.body;
      const sendMoney = userInfo?.money;

      const qurey = { email: userInfo?.email };
      const currentUser = await userCollections.findOne(qurey);
      const isExist = bcrypt.compareSync(
        userInfo?.password,
        currentUser.password
      );

      if (!isExist) {
        return res.send({
          message: 'Your pin invalid. Please try again',
        });
      }
      const result = await transactionCollections.insertOne(userInfo);
      if (result.insertedId) {
        const updateDc = {
          $inc: { balance: -sendMoney },
        };
        const curBalance = await userCollections.updateOne(qurey, updateDc);
      }
      res.send({ user: result });
    });

    app.patch('/send-free', async (req, res) => {
      const qurey = { email: req.query.email };

      const updateDc = {
        $inc: { balance: -5 },
      };

      const result = await userCollections.updateOne(qurey, updateDc);
      res.send(result);
    });

    app.post('/cash-out', async (req, res) => {
      const cashout = req.body;
      const qurey = { email: cashout?.email };
      const currentUser = await userCollections.findOne(qurey);
      const isExist = bcrypt.compareSync(
        cashout?.password,
        currentUser.password
      );

      if (!isExist) {
        return res.send({
          message: 'Your pin invalid. Please try again',
        });
      }
      const cashFree = cashout.money * 0.015;
      const money = cashout.money + cashFree;
      const numbers = { number: cashout.numbers };
      const user = await transactionCollections.insertOne(cashout);

      if (user.insertedId) {
        const updateDcs = {
          $inc: { balance: +money },
        };
        const agentUser = await userCollections.updateOne(numbers, updateDcs);
        const updateDcMoney = {
          $inc: { balance: -money },
        };
        const userMoneUp = await userCollections.updateOne(
          qurey,
          updateDcMoney
        );
      }
      res.send({ user: user });
    });

    app.post('/amount-request', async (req, res) => {
      const userInfo = req.body;
      const result = await transactionCollections.insertOne(userInfo);
      res.send(result);
    });

    app.get('/transactions-history', async (req, res) => {
      const qurey = { email: req.query.email };
      const result = await transactionCollections
        .find(qurey)
        .sort({ date: 1 })
        .limit(10)
        .toArray();
      res.send(result);
    });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`financial server port is ${port}`);
});
