import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../src/models/movieModel.js';

dotenv.config();

const sampleMovies = [
  {
    title: "Avengers: Endgame",
    duration: "181 min",
    genre: ["Action", "Adventure", "Drama"],
    plot: "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
    cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth", "Scarlett Johansson"],
    releaseDate: "2019-04-26",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
  },
  {
    title: "Spider-Man: No Way Home",
    duration: "148 min",
    genre: ["Action", "Adventure", "Sci-Fi"],
    plot: "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.",
    cast: ["Tom Holland", "Zendaya", "Benedict Cumberbatch", "Jacob Batalon", "Jon Favreau"],
    releaseDate: "2021-12-17",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
  },
  {
    title: "The Batman",
    duration: "176 min",
    genre: ["Action", "Crime", "Drama"],
    plot: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.",
    cast: ["Robert Pattinson", "Zoë Kravitz", "Paul Dano", "Jeffrey Wright", "John Turturro"],
    releaseDate: "2022-03-04",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg"
  },
  {
    title: "Top Gun: Maverick",
    duration: "130 min",
    genre: ["Action", "Drama"],
    plot: "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN's elite graduates on a mission that demands the ultimate sacrifice from those chosen to fly it.",
    cast: ["Tom Cruise", "Miles Teller", "Jennifer Connelly", "Jon Hamm", "Glen Powell"],
    releaseDate: "2022-05-27",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg"
  },
  {
    title: "Black Panther: Wakanda Forever",
    duration: "161 min",
    genre: ["Action", "Adventure", "Drama"],
    plot: "Queen Ramonda, Shuri, M'Baku, Okoye and the Dora Milaje fight to protect their nation from intervening world powers in the wake of King T'Challa's death.",
    cast: ["Letitia Wright", "Lupita Nyong'o", "Danai Gurira", "Winston Duke", "Dominique Thorne"],
    releaseDate: "2022-11-11",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg"
  },
  {
    title: "Avatar: The Way of Water",
    duration: "192 min",
    genre: ["Action", "Adventure", "Family"],
    plot: "Jake Sully lives with his newfamily formed on the planet of Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their planet.",
    cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver", "Stephen Lang", "Kate Winslet"],
    releaseDate: "2022-12-16",
    language: ["English", "Hindi"],
    bannerImg: "https://image.tmdb.org/t/p/w1280/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    verticalImg: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg"
  }
];

const seedMovies = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing movies
    await Movie.deleteMany({});
    console.log('Cleared existing movies');

    // Insert sample movies
    const insertedMovies = await Movie.insertMany(sampleMovies);
    console.log(`Inserted ${insertedMovies.length} movies successfully`);

    console.log('Sample movies added:');
    insertedMovies.forEach(movie => {
      console.log(`- ${movie.title} (${movie.releaseDate})`);
    });

  } catch (error) {
    console.error('Error seeding movies:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

seedMovies();