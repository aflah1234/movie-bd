import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTestUser() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'test@example.com' });
        
        if (existingUser) {
            console.log('ℹ️ Test user already exists, updating...');
            
            // Update the user to be verified and set correct password
            existingUser.isVerified = true;
            existingUser.password = await bcrypt.hash('password123', 10);
            existingUser.otp = null;
            existingUser.otpExpires = null;
            await existingUser.save();
            
            console.log('✅ Test user updated successfully');
        } else {
            console.log('Creating new test user...');
            
            const hashedPassword = await bcrypt.hash('password123', 10);
            
            const testUser = new User({
                name: 'Test User',
                email: 'test@example.com',
                password: hashedPassword,
                phone: '1234567890',
                isVerified: true, // Skip OTP verification
                isActive: true
            });
            
            await testUser.save();
            console.log('✅ Test user created successfully');
        }

        console.log('Test user credentials:');
        console.log('Email: test@example.com');
        console.log('Password: password123');
        
        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        process.exit(1);
    }
}

createTestUser();