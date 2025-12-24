import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_BASE = 'http://localhost:5000';

const testAuthAndShow = async () => {
    try {
        console.log('Testing authentication and show API flow...');
        
        // Step 1: Register a user
        const testEmail = `showtest+${Date.now()}@example.com`;
        const password = 'TestPass123!';
        const name = 'Show Test User';
        
        console.log('\n1. Registering user...');
        const signupRes = await fetch(`${CLIENT_BASE}/api/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: testEmail, password }),
        });
        const signupData = await signupRes.json();
        console.log('Signup response:', signupRes.status, signupData.message);
        
        // Step 2: Login to get auth cookie
        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${CLIENT_BASE}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password }),
        });
        const loginData = await loginRes.json();
        console.log('Login response:', loginRes.status, loginData.message);
        
        // Get cookies from login response
        const cookies = loginRes.headers.get('set-cookie');
        console.log('Cookies received:', cookies ? 'Yes' : 'No');
        
        if (cookies) {
            // Step 3: Test show API with authentication
            console.log('\n3. Testing show API with auth...');
            const showRes = await fetch(`${CLIENT_BASE}/api/show/by-date?movieId=6940220e2e3e5383254a52c4&date=2025-12-20`, {
                headers: {
                    'Cookie': cookies
                }
            });
            const showData = await showRes.text();
            console.log('Show API response:', showRes.status, showData);
        }
        
    } catch (error) {
        console.error('Error in test:', error.message);
    }
};

testAuthAndShow();