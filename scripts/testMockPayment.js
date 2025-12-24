import axios from 'axios';

const API_BASE = 'http://https://movie-bd-ashen.vercel.app/api';

// Test mock payment flow
async function testMockPayment() {
    console.log('🧪 Testing Mock Payment Flow...\n');

    try {
        // Step 1: Login as test user
        console.log('1. Logging in as test user...');
        const loginResponse = await axios.post(`${API_BASE}/user/login`, {
            email: 'test@example.com',
            password: 'password123'
        });

        if (!loginResponse.data.data) {
            throw new Error('Login failed: ' + loginResponse.data.message);
        }

        console.log('✅ Login successful');
        const token = loginResponse.headers['set-cookie']?.[0]?.split(';')[0]?.split('=')[1] || 
                     'Bearer ' + loginResponse.data.token;

        // Step 2: Get available shows
        console.log('\n2. Getting available shows...');
        // First get a movie ID from the database check
        const movieId = '6940220e2e3e5383254a52c2'; // The Great Adventure from database check
        const today = new Date().toISOString().split('T')[0];
        
        const showsResponse = await axios.get(`${API_BASE}/show/by-date?date=${today}&movieId=${movieId}`, {
            headers: { 
                'Cookie': loginResponse.headers['set-cookie']?.[0] || '',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!showsResponse.data.data || showsResponse.data.data.length === 0) {
            throw new Error('No shows available for testing');
        }

        const testShow = showsResponse.data.data[0];
        console.log(`✅ Found test show: ${testShow.movieId.title} at ${testShow.theaterId.name}`);

        // Step 3: Create a booking
        console.log('\n3. Creating test booking...');
        const bookingResponse = await axios.post(`${API_BASE}/booking/book-seats`, {
            showId: testShow._id,
            selectedSeats: ['A1', 'A2'],
            totalPrice: 240
        }, {
            headers: { 
                'Cookie': loginResponse.headers['set-cookie']?.[0] || '',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!bookingResponse.data.success) {
            throw new Error('Failed to create booking: ' + bookingResponse.data.message);
        }

        const bookingId = bookingResponse.data.data.bookingId;
        console.log(`✅ Booking created: ${bookingId}`);

        // Step 4: Test mock payment creation
        console.log('\n4. Testing mock payment creation...');
        const paymentResponse = await axios.post(`${API_BASE}/payment/createOrder`, {
            amount: 240,
            bookingId: bookingId
        }, {
            headers: { 
                'Cookie': loginResponse.headers['set-cookie']?.[0] || '',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!paymentResponse.data.order_id) {
            throw new Error('Failed to create payment order');
        }

        const orderId = paymentResponse.data.order_id;
        const isMock = paymentResponse.data.mock;
        console.log(`✅ Payment order created: ${orderId} (Mock: ${isMock})`);

        // Step 5: Test mock payment verification
        console.log('\n5. Testing mock payment verification...');
        const verificationResponse = await axios.post(`${API_BASE}/payment/paymentVerification`, {
            razorpay_order_id: orderId,
            razorpay_payment_id: `mock_payment_${Date.now()}`,
            razorpay_signature: `mock_signature_${Date.now()}`,
            bookingId: bookingId
        }, {
            headers: { 
                'Cookie': loginResponse.headers['set-cookie']?.[0] || '',
                'Authorization': `Bearer ${token}`
            }
        });

        if (verificationResponse.data.message.includes('verified') || 
            verificationResponse.data.message.includes('confirmed')) {
            console.log('✅ Mock payment verification successful');
            console.log(`✅ Message: ${verificationResponse.data.message}`);
        } else {
            throw new Error('Payment verification failed: ' + verificationResponse.data.message);
        }

        console.log('\n🎉 Mock Payment Flow Test PASSED!');
        console.log('✅ All steps completed successfully');
        console.log('✅ Mock payment system is working correctly');

    } catch (error) {
        console.error('\n❌ Mock Payment Flow Test FAILED!');
        console.error('Error:', error.response?.data?.message || error.message);
        
        if (error.response?.data) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testMockPayment();