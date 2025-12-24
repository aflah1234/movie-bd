import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Admin from '../src/models/adminModel.js';

dotenv.config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Hash password
    const hashedPassword = await bcryptjs.hash('admin123', 10);

    // Admin user
    const adminUser = {
      name: 'Admin User',
      email: 'admin@cinebook.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    };

    // Theater Owner user
    const theaterOwnerUser = {
      name: 'Theater Owner',
      email: 'owner@cinebook.com',
      password: hashedPassword,
      role: 'theaterOwner',
      isVerified: true
    };

    // Regular user for testing
    const regularUser = {
      name: 'Test User',
      email: 'user@cinebook.com',
      password: hashedPassword,
      isVerified: true
    };

    // Clear existing admin users
    await Admin.deleteMany({ 
      email: { 
        $in: ['admin@cinebook.com', 'owner@cinebook.com'] 
      } 
    });
    console.log('Cleared existing admin users');

    // Clear existing regular users
    await User.deleteMany({ 
      email: 'user@cinebook.com'
    });
    console.log('Cleared existing regular users');

    // Insert admin and theater owner
    const adminUsers = [adminUser, theaterOwnerUser];
    const insertedAdmins = await Admin.insertMany(adminUsers);
    
    // Insert regular user
    const insertedUser = await User.create(regularUser);

    console.log(`\n✅ Successfully created users:`);
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('==========================================');
    
    insertedAdmins.forEach(user => {
      console.log(`\n🔑 ${user.role.toUpperCase()} LOGIN:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: admin123`);
      console.log(`   Role: ${user.role}`);
    });

    console.log(`\n🔑 USER LOGIN:`);
    console.log(`   Email: ${insertedUser.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: user`);
    
    console.log('\n==========================================');
    console.log('💡 Use these credentials to login to your application');
    console.log('🌐 Admin Panel: http://localhost:5001/admin');
    console.log('🏢 Owner Panel: http://localhost:5001/owner');
    console.log('👤 User Panel: http://localhost:5001/user');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

seedUsers();