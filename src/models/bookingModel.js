import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    showId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Show',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    selectedSeats: [{
        seatNumber: { type: String, required: true },
        status: { type: String, enum: ['pending', 'booked'], default: 'pending' }
    }],
    totalPrice: {
        type: Number,
        required: true,
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    status: {
        type: String,
        enum: ['pending', 'booked', 'cancelled'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid_online', 'paid_at_theater'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        enum: ['online', 'theater_counter'],
        default: 'theater_counter',
    },
},
    { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);

