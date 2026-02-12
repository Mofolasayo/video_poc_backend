const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const sdkKey = process.env.ZOOM_VIDEO_SDK_KEY;
const sdkSecret = process.env.ZOOM_VIDEO_SDK_SECRET;
const port = process.env.PORT || 4000;

function requireEnv() {
  if (!sdkKey || !sdkSecret) {
    return {
      error: 'Missing ZOOM_VIDEO_SDK_KEY or ZOOM_VIDEO_SDK_SECRET in environment.'
    };
  }
  return null;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/video-sdk/token', (req, res) => {
  const envError = requireEnv();
  if (envError) {
    return res.status(500).json(envError);
  }

  const {
    sessionName,
    role,
    userIdentity,
    sessionKey,
    expirationSeconds
  } = req.body || {};

  if (!sessionName || typeof sessionName !== 'string') {
    return res.status(400).json({ error: 'sessionName is required.' });
  }

  if (role !== 0 && role !== 1) {
    return res.status(400).json({ error: 'role must be 0 or 1.' });
  }

  let expSeconds = Number(expirationSeconds || 3600);
  if (Number.isNaN(expSeconds)) {
    return res.status(400).json({ error: 'expirationSeconds must be a number.' });
  }
  if (expSeconds < 1800 || expSeconds > 172800) {
    return res.status(400).json({
      error: 'expirationSeconds must be between 1800 and 172800.'
    });
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + expSeconds;

  const payload = {
    app_key: sdkKey,
    version: 1,
    tpc: sessionName,
    role_type: role,
    iat,
    exp
  };

  if (userIdentity) {
    payload.user_identity = String(userIdentity);
  }

  if (sessionKey) {
    payload.session_key = String(sessionKey);
  }

  const token = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

  return res.json({
    token,
    sessionName,
    userIdentity: userIdentity || null,
    expiresAt: exp
  });
});

app.listen(port, () => {
  console.log(`Video SDK token server listening on :${port}`);
});
