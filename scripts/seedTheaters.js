import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Theater from '../src/models/theaterModel.js';
import Admin from '../src/models/adminModel.js';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  try {
    const ok = await connectDB();
    if (!ok) throw new Error('DB connection failed');

    // Create a theater owner admin first
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Clear existing theater owner
    await Admin.deleteMany({ email: 'theaterowner@example.com' });
    
    const theaterOwner = new Admin({
      name: 'Theater Owner',
      email: 'theaterowner@example.com',
      password: hashedPassword,
      role: 'theaterOwner',
      isVerified: true
    });
    await theaterOwner.save();
    console.log('Created theater owner admin');

    // Sample theaters
    const sampleTheaters = [
      {
        name: 'Grand Cinema',
        location: 'Downtown',
        rows: 8,
        cols: 12,
        ownerId: theaterOwner._id,
        status: 'approved'
      },
      {
        name: 'Star Theater',
        location: 'Mall Road',
        rows: 10,
        cols: 15,
        ownerId: theaterOwner._id,
        status: 'approved'
      },
      {
        name: 'Royal Multiplex',
        location: 'City Center',
        rows: 12,
        cols: 18,
        ownerId: theaterOwner._id,
        status: 'approved'
      }
    ];

    // Clear existing theaters
    await Theater.deleteMany({ name: { $in: sampleTheaters.map(t => t.name) } });

    const inserted = await Theater.insertMany(sampleTheaters);
    console.log(`Inserted ${inserted.length} sample theaters`);
    
    // Display theater IDs for reference
    inserted.forEach(theater => {
      console.log(`  - ${theater.name} (ID: ${theater._id})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error seeding theaters', err);
    process.exit(1);
  }
};

run();