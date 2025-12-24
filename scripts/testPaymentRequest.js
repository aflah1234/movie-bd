import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Booking from '../src/models/bookingModel.js';
import User from '../src/models/userModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_BASE = 'http://localhost:5000';

const testPaymentRequest = async () => {
    try {
        console.log('🧪 Testing Payment Request with Real Booking...\n');
        
        // Connect to DB to create a real booking
        const connected = await connectDB();
        if (!connected) {
            console.error('Failed to connect to database');
            return;
        }
        
        // Step 1: Register and login user
        const testEmail = `paymenttest+${Date.now()}@example.com`;
        const password = 'TestPass123!';
        const name = 'Payment Test User';
        
        console.log('1️⃣ Registering and logging in user...');
        const signupRes = await fetch(`${CLIENT_BASE}/api/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: testEmail, password }),
        });
        
        const loginRes = await fetch(`${CLIENT_BASE}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password }),
        });
        
        const loginData = await loginRes.json();
        const cookies = loginRes.headers.get('set-cookie');
        
        // Get user ID from login response
        const userId = loginData.data._id;
        console.log('✅ User logged in:', userId);
        
        // Step 2: Create a real booking in the database
        console.log('\n2️⃣ Creating a test booking...');
        const testBooking = new Booking({
            userId: userId,
            showId: '6940220e2e3e5383254a52c4', // Use existing show ID
            selectedSeats: [
                { seatNumber: 'A1', status: 'pending' },
                { seatNumber: 'A2', status: 'pending' }
            ],
            totalPrice: 500,
            status: 'pending'
        });
        
        await testBooking.save();
        console.log('✅ Booking created:', testBooking._id);
        
        // Step 3: Test payment creation with real booking
        console.log('\n3️⃣ Testing payment creation...');
        const paymentRes = await fetch(`${CLIENT_BASE}/api/payment/createOrder`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({ 
                amount: 500, 
                bookingId: testBooking._id.toString()
            }),
        });
        
        console.log('Payment API Status:', paymentRes.status);
        const paymentData = await paymentRes.text();
        console.log('Payment Response:', paymentData);
        
        if (paymentRes.status === 200) {
            console.log('\n✅ SUCCESS: Payment order created successfully!');
        } else {
            console.log('\n❌ FAILED: Payment creation failed');
            console.log('This is the exact error the frontend is seeing');
        }
        
        // Cleanup
        await Booking.findByIdAndDelete(testBooking._id);
        console.log('\n🧹 Cleanup: Test booking deleted');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error in payment request test:', error.message);
        process.exit(1);
    }
};

testPaymentRequest();