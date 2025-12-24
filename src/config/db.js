import mongoose from "mongoose";

const connectDB = async (options = {}) => {
    if (!process.env.MONGO_URI) {
        console.warn("MONGO_URI not set, skipping MongoDB connection");
        return false;
    }

    const maxRetries = options.maxRetries ?? 5;
    const retryDelay = options.retryDelay ?? 5000;
    const opts = {
        // keep timeouts low for local development so server doesn't hang
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const connect = await mongoose.connect(process.env.MONGO_URI, opts);
            console.log(`MongoDB Connected: ${connect.connection.host}`);
            return true;
        } catch (error) {
            attempt++;
            console.error(`MongoDB connection attempt ${attempt} failed:`, error.message || error);
            if (attempt >= maxRetries) {
                console.error('Failed to connect to MongoDB after maximum retries.');
                return false;
            }
            console.log(`Retrying MongoDB connection in ${retryDelay / 1000}s...`);
            await new Promise((res) => setTimeout(res, retryDelay));
        }
    }
    return false;
};

export default connectDB;