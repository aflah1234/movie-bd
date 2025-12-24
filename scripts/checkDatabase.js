import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Movie from '../src/models/movieModel.js';
import Show from '../src/models/showModel.js';
import Theater from '../src/models/theaterModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const checkDatabase = async () => {
    try {
        console.log('Connecting to database...');
        const connected = await connectDB();
        if (!connected) {
            console.error('Failed to connect to database');
            return;
        }
        
        console.log('\n=== DATABASE CONTENT CHECK ===');
        
        // Check movies
        const movies = await Movie.find().limit(5);
        console.log(`\n📽️ Movies in database: ${movies.length}`);
        movies.forEach(movie => {
            console.log(`  - ${movie.title} (ID: ${movie._id})`);
        });
        
        // Check theaters
        const theaters = await Theater.find().limit(5);
        console.log(`\n🏛️ Theaters in database: ${theaters.length}`);
        theaters.forEach(theater => {
            console.log(`  - ${theater.name} in ${theater.location} (Status: ${theater.status})`);
        });
        
        // Check shows
        const shows = await Show.find().limit(10);
        console.log(`\n🎭 Shows in database: ${shows.length}`);
        shows.forEach(show => {
            console.log(`  - Movie: ${show.movieId}, Theater: ${show.theaterId}, Date: ${show.dateTime}`);
        });
        
        if (shows.length === 0) {
            console.log('\n⚠️ No shows found in database. This explains the 404 error.');
            console.log('To fix this, you need to:');
            console.log('1. Add theaters to the database');
            console.log('2. Add shows for movies in those theaters');
            console.log('3. Or run a seed script to populate sample data');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error checking database:', error);
        process.exit(1);
    }
};

checkDatabase();