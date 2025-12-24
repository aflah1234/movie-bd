import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Show from '../src/models/showModel.js';
import Movie from '../src/models/movieModel.js';
import Theater from '../src/models/theaterModel.js';
import Admin from '../src/models/adminModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  try {
    const ok = await connectDB();
    if (!ok) throw new Error('DB connection failed');

    // Get existing movies and theaters
    const movies = await Movie.find();
    const theaters = await Theater.find();
    const theaterOwner = await Admin.findOne({ role: 'theaterOwner' });

    if (movies.length === 0) {
      console.log('No movies found. Run seedMovies.js first.');
      process.exit(1);
    }

    if (theaters.length === 0) {
      console.log('No theaters found. Run seedTheaters.js first.');
      process.exit(1);
    }

    if (!theaterOwner) {
      console.log('No theater owner found. Run seedTheaters.js first.');
      process.exit(1);
    }

    console.log(`Found ${movies.length} movies and ${theaters.length} theaters`);

    // Clear existing shows
    await Show.deleteMany({});

    const sampleShows = [];
    const today = new Date();
    
    // Create shows for the next 7 days
    for (let day = 0; day < 7; day++) {
      const showDate = new Date(today);
      showDate.setDate(today.getDate() + day);
      
      // Create multiple shows per day
      const showTimes = ['10:00', '14:00', '18:00', '21:30'];
      
      for (const movie of movies) {
        for (const theater of theaters) {
          for (const timeStr of showTimes) {
            const [hours, minutes] = timeStr.split(':');
            const showDateTime = new Date(showDate);
            showDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Create seats array based on theater dimensions
            const seats = Array(theater.rows)
              .fill()
              .map(() => Array(theater.cols).fill("available"));
            
            sampleShows.push({
              movieId: movie._id,
              theaterId: theater._id,
              dateTime: showDateTime,
              ticketPrice: Math.floor(Math.random() * 200) + 100, // Random price between 100-300
              ownerId: theaterOwner._id,
              seats: seats,
              status: 'notStarted'
            });
          }
        }
      }
    }

    const inserted = await Show.insertMany(sampleShows);
    console.log(`Inserted ${inserted.length} sample shows`);
    
    // Display some sample shows
    console.log('\nSample shows created:');
    const sampleShowsToDisplay = inserted.slice(0, 5);
    for (const show of sampleShowsToDisplay) {
      const movie = await Movie.findById(show.movieId);
      const theater = await Theater.findById(show.theaterId);
      console.log(`  - ${movie.title} at ${theater.name} on ${show.dateTime.toLocaleDateString()} ${show.dateTime.toLocaleTimeString()}`);
    }
    
    console.log(`\n✅ Database seeded successfully!`);
    console.log(`📽️ Movies: ${movies.length}`);
    console.log(`🏛️ Theaters: ${theaters.length}`);
    console.log(`🎭 Shows: ${inserted.length}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error seeding shows', err);
    process.exit(1);
  }
};

run();