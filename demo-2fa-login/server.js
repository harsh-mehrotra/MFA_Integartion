const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// 🧪 Multiple test users
const users = [
  {
    username: 'harsh',
    password: 'harsh123',
    secret: speakeasy.generateSecret({ name: 'DemoMFA (harsh)' }),
    mfaSetupDone: false
  },
  {
    username: 'alice',
    password: 'alice123',
    secret: speakeasy.generateSecret({ name: 'DemoMFA (alice)' }),
    mfaSetupDone: false
  },
  {
    username: 'bob1',
    password: 'bob4567',
    secret: speakeasy.generateSecret({ name: 'DemoMFA (bob)' }),
    mfaSetupDone: false
  }
];

// Login page
app.get('/', (req, res) => {
  res.render('index');
});

// Handle login and redirect to MFA setup
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;

    if (user.mfaSetupDone) {
        return res.redirect('/verify');
      }
    qrcode.toDataURL(user.secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).send("QR Code Error");
      req.session.qr = data_url;
      res.redirect('/setup');
    });
  } else {
    res.send('❌ Invalid credentials');
  }
});

// Show QR code for MFA
app.get('/setup', (req, res) => {
  if (!req.session.user || !req.session.qr) return res.redirect('/');
  res.render('setup', { qr: req.session.qr });
});

// Show the TOTP code input page
app.get('/verify', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('verify');
  });
  

// Handle TOTP verification
app.post('/verify', (req, res) => {
  const { token } = req.body;
  const user = req.session.user;

  if (!user) return res.redirect('/');

  const verified = speakeasy.totp.verify({
    secret: user.secret.base32,
    encoding: 'base32',
    token,
    window: 1
  });

  if (verified) {
    req.session.verified = true;
    user.mfaSetupDone = true;
    res.redirect('/success');
  } else {
    res.send('❌ Invalid TOTP code');
  }
});

// Success page after verification
app.get('/success', (req, res) => {
  if (!req.session.verified) return res.redirect('/');
  res.render('success', { user: req.session.user });
});

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
