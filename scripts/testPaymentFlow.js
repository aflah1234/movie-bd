import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_BASE = 'http://localhost:5000';

const testPaymentFlow = async () => {
    try {
        console.log('🧪 Testing Payment Flow...\n');
        
        // Step 1: Register and login user
        const testEmail = `paymenttest+${Date.now()}@example.com`;
        const password = 'TestPass123!';
        const name = 'Payment Test User';
        
        console.log('1️⃣ Registering user...');
        const signupRes = await fetch(`${CLIENT_BASE}/api/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: testEmail, password }),
        });
        const signupData = await signupRes.json();
        console.log('✅ Signup:', signupData.message);
        
        console.log('\n2️⃣ Logging in...');
        const loginRes = await fetch(`${CLIENT_BASE}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password }),
        });
        const loginData = await loginRes.json();
        console.log('✅ Login:', loginData.message);
        
        const cookies = loginRes.headers.get('set-cookie');
        if (!cookies) {
            console.log('❌ No authentication cookies received');
            return;
        }
        
        console.log('\n3️⃣ Testing payment endpoint...');
        
        // Test payment creation (this will fail because we don't have a real booking)
        const paymentRes = await fetch(`${CLIENT_BASE}/api/payment/createOrder`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({ 
                amount: 500, 
                bookingId: '507f1f77bcf86cd799439011' // Fake booking ID for testing
            }),
        });
        
        console.log('Payment API Status:', paymentRes.status);
        const paymentData = await paymentRes.text();
        console.log('Payment Response:', paymentData);
        
        if (paymentRes.status === 401) {
            console.log('\n❌ ISSUE: Still getting 401 Unauthorized');
            console.log('This means authentication is not working properly');
        } else if (paymentRes.status === 404) {
            console.log('\n✅ GOOD: Authentication works! (404 = booking not found, which is expected)');
        } else {
            console.log('\n✅ Payment endpoint is accessible');
        }
        
        // Check Razorpay configuration
        console.log('\n4️⃣ Checking Razorpay configuration...');
        console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID || 'NOT SET');
        console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET');
        console.log('RAZORPAY_MODE:', process.env.RAZORPAY_MODE || 'NOT SET');
        
        if (process.env.RAZORPAY_KEY_ID?.includes('your_')) {
            console.log('\n⚠️  WARNING: Razorpay keys are still placeholders');
            console.log('You need real Razorpay test keys for payments to work');
        }
        
    } catch (error) {
        console.error('❌ Error in payment flow test:', error.message);
    }
};

testPaymentFlow();