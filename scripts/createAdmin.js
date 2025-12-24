import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Admin from '../src/models/adminModel.js';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        const ok = await connectDB();
        if (!ok) throw new Error('DB connection failed');

        // Admin credentials
        const adminEmail = 'admin@cinebook.com';
        const adminPassword = 'admin123';
        const adminName = 'System Admin';

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists!');
            console.log('Email:', adminEmail);
            console.log('Password:', adminPassword);
            console.log('Role: admin');
            console.log('\n✅ Use these credentials to login at: http://localhost:5000/admin/login');
            process.exit(0);
        }

        // Create new admin
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const newAdmin = new Admin({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            isVerified: true // Skip OTP for admin too
        });

        await newAdmin.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('\n📋 Admin Login Credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('Role: admin');
        console.log('\n🔗 Admin Login URL: http://localhost:5000/admin/login');
        console.log('\n📊 After login, you can access:');
        console.log('- Admin Dashboard: http://localhost:5000/admin/dashboard');
        console.log('- Manage Theaters');
        console.log('- Manage Users');
        console.log('- View Analytics');
        
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
};

createAdmin();