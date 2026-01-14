import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";
import mongoose from "mongoose";
import Show from "../models/showModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// CinePay - Custom Payment Gateway
// This is a simple internal payment system for demonstration

// Generate a unique transaction ID
function generateTransactionId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `CINEPAY_${timestamp}_${random}`.toUpperCase();
}

// Simulate payment processing (in real scenario, this would call your payment API)
function processPayment(amount, cardDetails) {
    return new Promise((resolve, reject) => {
        // Simulate API call delay (reduced for better UX)
        setTimeout(() => {
            // Simple validation
            if (!cardDetails.cardNumber || !cardDetails.cvv || !cardDetails.expiryDate) {
                reject(new Error('Invalid card details'));
                return;
            }

            // Simulate success/failure based on card number
            const lastDigit = cardDetails.cardNumber.slice(-1);
            
            if (lastDigit === '0') {
                // Card ending in 0 = declined
                reject(new Error('Payment declined by bank'));
            } else if (lastDigit === '9') {
                // Card ending in 9 = insufficient funds
                reject(new Error('Insufficient funds'));
            } else {
                // All other cards = success
                const transactionId = generateTransactionId();
                resolve({
                    success: true,
                    transactionId,
                    amount,
                    timestamp: new Date().toISOString(),
                    status: 'completed'
                });
            }
        }, 500); // Reduced from 2000ms to 500ms for faster processing
    });
}

export const createCinePayTransaction = async (req, res) => {
    const { amount, bookingId, cardDetails } = req.body;
    
    console.log('🎬 CinePay Transaction - Request received:', {
        hasUser: !!req.user,
        userId: req.user?.userId,
        amount,
        bookingId,
        hasCardDetails: !!cardDetails
    });
    
    const userId = req.user.userId;

    try {
        console.log('CinePay payment request received:', { amount, bookingId, userId, cardDetails });

        if (!amount || !bookingId || !cardDetails) {
            console.log('❌ Missing required fields:', { 
                hasAmount: !!amount, 
                hasBookingId: !!bookingId, 
                hasCardDetails: !!cardDetails 
            });
            return res.status(400).json({ 
                message: "Amount, bookingId, and card details are required",
                missing: {
                    amount: !amount,
                    bookingId: !bookingId,
                    cardDetails: !cardDetails
                }
            });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            console.log('❌ Booking not found:', bookingId);
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.userId.toString() !== userId) {
            console.log('❌ Unauthorized booking access:', { bookingUserId: booking.userId, requestUserId: userId });
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

        const existingPayment = await Payment.findOne({ bookingId });
        if (existingPayment && existingPayment.status === 'completed') {
            console.log('❌ Payment already completed:', bookingId);
            return res.status(400).json({ message: "Payment already completed for this booking" });
        }

        // Generate transaction ID
        const transactionId = generateTransactionId();
        console.log('✅ Transaction ID generated:', transactionId);

        // Create pending payment record
        const payment = new Payment({
            cinepay_transaction_id: transactionId,
            userId,
            amount,
            bookingId,
            status: "pending",
            paymentGateway: "cinepay"
        });

        await payment.save();
        console.log("✅ CinePay payment record created");

        res.status(200).json({
            message: "Transaction initiated successfully",
            transactionId,
            amount,
            status: "pending"
        });
    } catch (error) {
        console.error("❌ Error in createCinePayTransaction controller:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        res.status(error.statusCode || 500).json({ 
            message: error.message || "Internal server error",
            error: error.message
        });
    }
};

export const processCinePayPayment = async (req, res) => {
    console.log('🎬 processCinePayPayment - START');
    const session = await mongoose.startSession();
    session.startTransaction();
    console.log('✅ Transaction started');

    try {
        const { transactionId, bookingId, cardDetails } = req.body;
        const userId = req.user.userId;

        console.log('📝 Processing CinePay payment:', { transactionId, bookingId, userId });

        if (!transactionId || !bookingId || !cardDetails) {
            console.log('❌ Missing payment details');
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid payment details" });
        }

        console.log('🔍 Finding booking...');
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking || booking.userId.toString() !== userId) {
            console.log('❌ Booking not found or unauthorized');
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }
        console.log('✅ Booking found:', booking._id);

        console.log('🔍 Finding show...');
        const show = await Show.findById(booking.showId)
            .populate("movieId", "title verticalImg") 
            .populate("theaterId", "name location") 
            .session(session);
        if (!show) {
            console.log('❌ Show not found');
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Show not found" });
        }
        console.log('✅ Show found:', show._id);

        console.log('🔍 Finding user...');
        const user = await User.findById(userId).session(session);
        console.log('✅ User found:', user?.email);

        // Process payment through CinePay
        try {
            console.log('💳 Processing payment...');
            const paymentResult = await processPayment(booking.totalPrice, cardDetails);
            console.log('✅ CinePay payment successful:', paymentResult);

            // Update booking status
            console.log('📝 Updating booking status...');
            booking.status = "booked";
            booking.selectedSeats.forEach(seat => seat.status = "booked");
            await booking.save({ session });
            console.log('✅ Booking updated');

            // Update payment record
            console.log('📝 Updating payment record...');
            const payment = await Payment.findOne({ cinepay_transaction_id: transactionId }).session(session);
            if (payment) {
                payment.status = "completed";
                payment.cinepay_payment_response = JSON.stringify(paymentResult);
                await payment.save({ session });
                console.log('✅ Payment record updated');
            } else {
                console.log('⚠️ Payment record not found');
            }

            // Update seat availability
            console.log('📝 Updating seat availability...');
            booking.selectedSeats.forEach(seat => {
                const row = seat.seatNumber.charCodeAt(0) - 65;
                const col = parseInt(seat.seatNumber.substring(1)) - 1;
                show.seats[row][col] = "booked";
            });
            show.markModified("seats");
            await show.save({ session });
            console.log('✅ Seats updated');

            // Add booking to user
            console.log('📝 Adding booking to user...');
            await User.findByIdAndUpdate(userId, {
                $push: { bookings: bookingId }
            }).session(session);
            console.log('✅ User bookings updated');

            console.log('💾 Committing transaction...');
            await session.commitTransaction();
            session.endSession();
            console.log('✅ Transaction committed');

            // Prepare booking details for email
            const showDateTime = new Date(show.dateTime);
            const showDate = showDateTime.toDateString(); 
            const showTime = showDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); 

            const bookingDetails = {
                movieName: show.movieId.title,
                theaterName: show.theaterId.name,
                poster: show.movieId.verticalImg,
                location: show.theaterId.location, 
                showTime: showTime, 
                showDate: showDate, 
                selectedSeats: booking.selectedSeats.map(seat => seat.seatNumber),
                totalPrice: booking.totalPrice,
            };

            console.log("✅ CinePay payment completed successfully");
            
            // Send email asynchronously (don't wait for it)
            console.log('📧 Sending email asynchronously...');
            sendEmail(user.email, "booking", bookingDetails).catch(err => {
                console.error('⚠️ Email sending failed (non-critical):', err.message);
            });

            return res.status(200).json({ 
                message: "Payment successful, booking confirmed!",
                transactionId: paymentResult.transactionId,
                bookingId: booking._id
            });

        } catch (paymentError) {
            // Payment failed
            console.error('❌ Payment processing failed:', paymentError.message);
            await session.abortTransaction();
            session.endSession();

            // Update payment status to failed
            await Payment.findOneAndUpdate(
                { cinepay_transaction_id: transactionId },
                { 
                    status: "failed",
                    cinepay_payment_response: JSON.stringify({ error: paymentError.message })
                }
            );

            console.error('CinePay payment failed:', paymentError.message);
            return res.status(400).json({ 
                message: paymentError.message || "Payment processing failed"
            });
        }

    } catch (error) {
        console.error("❌ Error processing CinePay payment:", error);
        console.error("Error stack:", error.stack);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Error processing payment", error: error.message });
    }
};

// Get transaction status
export const getCinePayTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.userId;

        const payment = await Payment.findOne({ 
            cinepay_transaction_id: transactionId,
            userId 
        });

        if (!payment) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.status(200).json({
            transactionId: payment.cinepay_transaction_id,
            status: payment.status,
            amount: payment.amount,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt
        });
    } catch (error) {
        console.error("Error fetching transaction status:", error);
        res.status(500).json({ message: "Error fetching transaction status" });
    }
};
