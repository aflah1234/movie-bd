import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import User from '../src/models/userModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_BASE = process.env.CLIENT_URL || 'http://localhost:5000';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const testEmail = `authtest+${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const name = 'Auth Flow Test';

  console.log('1) Calling signup via client proxy...');
  const signupRes = await fetch(`${CLIENT_BASE}/api/user/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email: testEmail, password }),
  });
  const signupData = await signupRes.json();
  console.log('Signup response:', signupRes.status, signupData.message || signupData);

  console.log('2) Connecting to DB and reading OTP...');
  const ok = await connectDB();
  if (!ok) {
    console.error('DB connect failed');
    process.exit(1);
  }

  let user;
  for (let i = 0; i < 10; i++) {
    user = await User.findOne({ email: testEmail });
    if (user && user.otp) break;
    await delay(500);
  }

  if (!user || !user.otp) {
    console.error('Could not find OTP for', testEmail);
    process.exit(1);
  }

  console.log('Found OTP:', user.otp);

  console.log('3) Verifying OTP via client proxy...');
  const verifyRes = await fetch(`${CLIENT_BASE}/api/user/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: user.otp }),
  });
  const verifyData = await verifyRes.json();
  console.log('Verify response:', verifyRes.status, verifyData.message || verifyData);

  if (verifyRes.status !== 200) {
    console.error('Verification failed');
    process.exit(1);
  }

  console.log('4) Logging in to obtain auth cookie...');
  const loginRes = await fetch(`${CLIENT_BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password }),
  });

  const loginData = await loginRes.json();
  console.log('Login response:', loginRes.status, loginData.message || loginData);
  console.log('Set-Cookie header present:', loginRes.headers.get('set-cookie') ? 'yes' : 'no');

  if (loginRes.status === 200) {
    console.log('Auth flow successful for', testEmail);
    process.exit(0);
  } else {
    process.exit(1);
  }
};

run().catch((err) => {
  console.error('Error in auth flow test', err);
  process.exit(1);
});
