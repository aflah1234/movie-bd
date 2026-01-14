import mongoose from 'mongoose';


const paymentSchema = new mongoose.Schema({
    // Payment Gateway Type
    paymentGateway: {
        type: String,
        enum: ['cinepay'],
        default: 'cinepay',
        required: true
    },
    
    // CinePay fields (Custom Payment Gateway)
    cinepay_transaction_id: {
        type: String,
        unique: true,
        sparse: true
    },
    cinepay_payment_response: {
        type: String // JSON string of payment response
    },
    
    // Common fields
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true
    },    
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
        required: true
    },
}, 
{ timestamps: true });

export default mongoose.model('payment', paymentSchema);

