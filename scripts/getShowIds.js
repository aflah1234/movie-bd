import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Show from '../src/models/showModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getShowIds = async () => {
    try {
        const connected = await connectDB();
        if (!connected) {
            console.error('Failed to connect to database');
            return;
        }
        
        const shows = await Show.find().limit(5);
        console.log('Available Show IDs:');
        shows.forEach((show, index) => {
            console.log(`${index + 1}. Show ID: ${show._id}`);
            console.log(`   Movie: ${show.movieId}`);
            console.log(`   Theater: ${show.theaterId}`);
            console.log(`   Date: ${show.dateTime}`);
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

getShowIds();