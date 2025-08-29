require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const rewardsRoutes = require('./routes/rewards');
const habitRoutes = require('./routes/habitRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leaderboardRoutes = require('./routes/leaderboard');

const User = require('./models/User');

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('Mongo error', err); process.exit(1); 
});

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.set('view engine', 'ejs');  
app.set('views', path.join(__dirname, 'views'));

app.use(async (req, res, next) => {
  try {
    res.locals.user = req.session && req.session.user ? req.session.user : null;

    if (req.session && req.session.user && req.session.user.id) {
      if (!req.user) {
        req.user = await User.findById(req.session.user.id).lean();
      }
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
});


app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', habitRoutes);
app.use('/', adminRoutes);
app.use('/rewards', rewardsRoutes);
app.use('/leaderboard', leaderboardRoutes);

app.get('/', (req, res) => {
  res.render('index');
});

app.use((req, res) => {
  res.status(404).render('404', { path: req.path });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal server error');
});

module.exports = app;
