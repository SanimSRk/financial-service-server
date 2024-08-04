const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://66acf3b943ec4d5e50f6f63b--chic-hamster-ebd90b.netlify.app',
      'https://financial-service-c1c6c.web.app',
    ],
  })
);

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
    // await client.connect();
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
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden acces' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden acces' });
        }
        req.decode = decode;
        next();
      });
    };
    const verifyUser = async (req, res, next) => {
      const email = req.decode.email;

      const qurey = { email: email, role: 'user' };
      const isUser = await userCollections.findOne(qurey);
      if (!isUser) {
        return res.status(401).send({ message: 'forbidden acces' });
      }
      next();
    };
    const verifyAgent = async (req, res, next) => {
      const email = req.decode.email;

      const qurey = { email: email, role: 'agent' };
      const isAgent = await userCollections.findOne(qurey);
      if (!isAgent) {
        return res.status(401).send({ message: 'forbidden acces' });
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decode.email;

      const qurey = { email: email, role: 'admin' };
      const isAdmin = await userCollections.findOne(qurey);
      if (!isAdmin) {
        return res.status(401).send({ message: 'forbidden acces' });
      }
      next();
    };

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
      const qureyNumber = { number: user?.number };
      const isExistNumber = await userCollections.findOne(qureyNumber);
      if (isExistNumber) {
        return res.send({ message: 'your email alredy account ' });
      }
      const isExist = await userCollections.findOne(qurey);

      if (!isExist) {
        const result = await userCollections.insertOne(userInfo);
        res.send(result);
      } else {
        return res.send({ message: 'your email alredy account ' });
      }
    });

    app.get('/login', async (req, res) => {
      const email = req.query.email;
      const password = req.query.password;

      const currentUser = await userCollections.findOne({ email: email });
      if (!currentUser?.email) {
        return res.send({
          message: 'Your email and password invalid. Please try again',
        });
      }
      const hxpassword = bcrypt.compareSync(password, currentUser?.password);

      if (!hxpassword) {
        return res.send({
          message: 'Your email and password invalid. Please try again',
        });
      } else {
        res.send({ user: currentUser });
      }
    });

    app.get('/users', verifyToken, async (req, res) => {
      const qurey = { email: req.query.email };
      const result = await userCollections.findOne(qurey);
      res.send(result);
    });

    app.post('/send-money', verifyToken, verifyUser, async (req, res) => {
      const userInfo = req.body;
      const sendMoney = userInfo?.money;
      const sendMoneyInfos = {
        email: userInfo.email,
        numbers: userInfo.numbers,
        money: userInfo.money,
        date: userInfo.date,
        paymentStatus: 'send-money',
      };
      const qurey = { email: userInfo?.email };
      const NumberQures = { number: userInfo.numbers };
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
      const result = await transactionCollections.insertOne(sendMoneyInfos);
      if (result.insertedId) {
        if (userInfo.money > 100) {
          const updateDcs = {
            $inc: { balance: -5 },
          };
          const curBalance = await userCollections.updateOne(qurey, updateDcs);
        }
        const updateDc = {
          $inc: { balance: -sendMoney },
        };
        const curBalance = await userCollections.updateOne(qurey, updateDc);

        const updatesDcsed = {
          $inc: { balance: +sendMoney },
        };
        const updateRecevUser = await userCollections.updateOne(
          NumberQures,
          updatesDcsed
        );
      }

      res.send({ user: result });
    });

    app.post('/cash-out', verifyToken, verifyUser, async (req, res) => {
      const cashout = req.body;
      const qurey = { email: cashout?.email };
      const cashoutInfos = {
        email: cashout.email,
        numbers: cashout.numbers,
        money: cashout.money,
        date: cashout.date,
        paymentStatus: 'cash-out',
      };
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
      const user = await transactionCollections.insertOne(cashoutInfos);

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

    app.post('/amount-request', verifyToken, verifyUser, async (req, res) => {
      const userInfo = req.body;
      const result = await transactionCollections.insertOne(userInfo);
      res.send(result);
    });

    app.get(
      '/transactions-history',
      verifyToken,
      verifyUser,
      async (req, res) => {
        const qurey = { email: req.query.email };
        const result = await transactionCollections
          .find(qurey)
          .sort({ date: -1 })
          .limit(10)
          .toArray();
        res.send(result);
      }
    );

    app.get(
      '/transactions-management',
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const qurey = { numbers: req.query.email, status: 'request' };

        const result = await transactionCollections.find(qurey).toArray();
        res.send(result);
      }
    );

    app.patch(
      '/userBalance-update',
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const money = parseFloat(req.body.money);
        const qurey = { email: req.query.email };
        const updateDc = {
          $inc: { balance: +money },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );

    app.patch(
      '/agentBalance-update',
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const money = parseFloat(req.body.money);
        const qurey = { email: req.query.email };
        const updateDc = {
          $inc: { balance: -money },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );

    app.put(
      '/request-mamagement/:id',
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;

        const qurey = { _id: new ObjectId(id) };

        const updateDc = {
          $set: { status: 'approve' },
        };
        const result = await transactionCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );

    app.post(
      '/send-payment-history',
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const userInfo = req.body;
        const result = await transactionCollections.insertOne(userInfo);
        res.send(result);
      }
    );

    app.get('/agent-history', verifyToken, verifyAgent, async (req, res) => {
      const qurey = { email: req.query.email };
      const result = await transactionCollections
        .find(qurey)
        .sort({ date: -1 })
        .limit(20)
        .toArray();
      res.send(result);
    });

    //-----------adim handile data ----------------
    app.get('/users-management', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });
    app.patch(
      '/active-account/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const qurey = { _id: new ObjectId(id) };
        const updateDc = {
          $set: { status: 'actived' },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );
    app.patch(
      '/block-account/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const qurey = { _id: new ObjectId(id) };
        const updateDc = {
          $set: { status: 'block' },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );

    app.patch(
      '/userBalance-updates/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const qurey = { _id: new ObjectId(id) };
        const updateDc = {
          $inc: { balance: +40 },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );
    app.patch(
      '/agentsBalance-updates/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const qurey = { _id: new ObjectId(id) };
        const updateDc = {
          $inc: { balance: +10000 },
        };

        const result = await userCollections.updateOne(qurey, updateDc);
        res.send(result);
      }
    );

    app.get('/searcNames', verifyToken, verifyAdmin, async (req, res) => {
      const qurey = { name: { $regex: req.query.search, $options: 'i' } };

      const result = await userCollections.find(qurey).toArray();
      res.send(result);
    });

    app.get('/all-transactions', verifyToken, verifyAdmin, async (req, res) => {
      const result = await transactionCollections.find().toArray();
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
