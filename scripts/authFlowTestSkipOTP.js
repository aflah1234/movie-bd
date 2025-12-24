import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import User from '../src/models/userModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_BASE = process.env.CLIENT_URL || 'http://localhost:5000';

const run = async () => {
  const testEmail = `authtest+${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const name = 'Auth Flow Test';

  console.log('1) Calling signup via client proxy (OTP should be skipped)...');
  const signupRes = await fetch(`${CLIENT_BASE}/api/user/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email: testEmail, password }),
  });
  const signupData = await signupRes.json();
  console.log('Signup response:', signupRes.status, signupData.message || signupData);

  if (signupData.message && signupData.message.includes('OTP skipped')) {
    console.log('✅ OTP was successfully skipped in development mode');
    
    console.log('2) Attempting direct login (should work since user is auto-verified)...');
    const loginRes = await fetch(`${CLIENT_BASE}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password }),
    });

    const loginData = await loginRes.json();
    console.log('Login response:', loginRes.status, loginData.message || loginData);
    console.log('Set-Cookie header present:', loginRes.headers.get('set-cookie') ? 'yes' : 'no');

    if (loginRes.status === 200) {
      console.log('✅ Auth flow successful with OTP skip for', testEmail);
      process.exit(0);
    } else {
      console.log('❌ Login failed after OTP skip');
      process.exit(1);
    }
  } else {
    console.log('❌ OTP was not skipped - check SKIP_OTP_IN_DEV setting');
    process.exit(1);
  }
};

run().catch((err) => {
  console.error('Error in auth flow test', err);
  process.exit(1);
});