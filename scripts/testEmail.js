import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sendEmail from '../src/utils/sendEmail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testEmail = async () => {
    try {
        console.log('Testing email delivery...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
        
        const testOTP = '123456';
        const testEmailAddress = 'test@example.com'; // Replace with your email for testing
        
        await sendEmail(testEmailAddress, 'otp', { otp: testOTP });
        console.log('✅ Email sent successfully!');
        
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔧 Authentication failed. Please check:');
            console.log('1. EMAIL_USER is a valid Gmail address');
            console.log('2. EMAIL_PASS is a 16-character App Password (not your Gmail password)');
            console.log('3. 2-Factor Authentication is enabled on your Gmail account');
        }
    }
};

testEmail();