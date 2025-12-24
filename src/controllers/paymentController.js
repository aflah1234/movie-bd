import Razorpay from "razorpay";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";
import mongoose from "mongoose";
import Show from "../models/showModel.js";
import crypto from "crypto";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";

const RAZORPAY_MODE = process.env.RAZORPAY_MODE || 'test';

function validateRazorpayKeys() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    if (!keyId || !keySecret) {
        console.warn('Razorpay keys are not set. Payment endpoints will not work without them.');
        return;
    }

    // If the user left the placeholder values, warn but don't throw
    if (keyId.includes('your_') || keySecret.includes('your_')) {
        console.warn('Razorpay keys appear to be placeholders. Replace them with real test keys (starting with "rzp_test_").');
        return;
    }

    if (RAZORPAY_MODE === 'test') {
        if (!keyId.startsWith('rzp_test_') || !keySecret.startsWith('rzp_test_')) {
            throw new Error('RAZORPAY_MODE is set to "test" but provided keys do not appear to be Razorpay test keys (should start with "rzp_test_").');
        }
    }

    if (RAZORPAY_MODE === 'live') {
        if (!keyId.startsWith('rzp_live_') || !keySecret.startsWith('rzp_live_')) {
            throw new Error('RAZORPAY_MODE is set to "live" but provided keys do not appear to be Razorpay live keys (should start with "rzp_live_").');
        }
    }
}

validateRazorpayKeys();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
    const { amount, bookingId } = req.body;
    
    // Debug authentication
    console.log('🔍 Payment createOrder - Auth debug:', {
        hasUser: !!req.user,
        userId: req.user?.userId,
        cookies: Object.keys(req.cookies),
        hasToken: !!req.cookies.token,
        origin: req.get('origin')
    });
    
    const userId = req.user.userId;

    try {
        console.log('Payment request received:', { amount, bookingId, userId });

        if (!amount || !bookingId) {
            console.log('Missing required fields:', { amount: !!amount, bookingId: !!bookingId });
            return res.status(400).json({ message: "Amount and bookingId are required" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            console.log('Booking not found:', bookingId);
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.userId.toString() !== userId) {
            console.log('Unauthorized booking access:', { bookingUserId: booking.userId, requestUserId: userId });
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

        const existingPayment = await Payment.findOne({ bookingId });
        if (existingPayment) {
            console.log('Payment already exists for booking:', bookingId);
            
            // If payment is still pending, allow retry by returning the existing order
            if (existingPayment.status === 'pending') {
                console.log('Returning existing pending payment order');
                return res.status(200).json({
                    message: "Using existing payment order",
                    order_id: existingPayment.razorpay_order_id,
                    amount: existingPayment.amount * 100,
                    currency: "INR",
                    existing: true
                });
            }
            
            // If payment is completed, don't allow retry
            return res.status(400).json({ message: "Payment already completed for this booking" });
        }

        // Skip payment in development mode
        if (process.env.SKIP_PAYMENT_IN_DEV === 'true') {
            const mockOrderId = `mock_order_${Date.now()}`;
            const payment = new Payment({
                razorpay_order_id: mockOrderId,
                userId,
                amount,
                bookingId,
                status: "pending",
            });

            await payment.save();
            console.log("Mock payment created for development");

            return res.status(200).json({
                message: "Mock order created successfully (development mode)",
                order_id: mockOrderId,
                amount: amount * 100,
                currency: "INR",
                mock: true
            });
        }

        const options = {
            amount: amount * 100,//convert to smallest unit
            currency: "INR",
            receipt: `receipt_${bookingId}`,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);
        if (!order || !order.id) {
            return res.status(500).json({ message: "Failed to create Razorpay order" });
        }

        const payment = new Payment({
            razorpay_order_id: order.id,
            userId,
            amount,
            bookingId,
            status: "pending",
        });

        await payment.save();
        console.log("Payment saved successfully");

        res.status(200).json({
            message: "Order created successfully",
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Error in createOrder controller:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// -----------payment verification------------
export const paymentVerification = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
        const userId = req.user.userId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
            return res.status(400).json({ message: "Invalid payment details" });
        }

        const booking = await Booking.findById(bookingId).session(session);
        if (!booking || booking.userId.toString() !== req.user.userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

        // Populate movieId and theaterId to get movie name, theater name, and location
        const show = await Show.findById(booking.showId)
            .populate("movieId", "title verticalImg") 
            .populate("theaterId", "name location") 
            .session(session);
        if (!show) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Show not found" });
        }

        const user = await User.findById(userId).session(session);

        // Handle mock payments in development
        if (process.env.SKIP_PAYMENT_IN_DEV === 'true' && razorpay_order_id.startsWith('mock_order_')) {
            console.log('Processing mock payment verification');
            
            // Skip signature verification for mock payments
            booking.status = "booked";
            booking.selectedSeats.forEach(seat => seat.status = "booked");
            await booking.save({ session });

            const payment = await Payment.findOne({ razorpay_order_id }).session(session);
            if (payment) {
                payment.status = "completed";
                payment.razorpay_payment_id = razorpay_payment_id;
                payment.razorpay_signature = razorpay_signature;
                await payment.save({ session });
            }

            booking.selectedSeats.forEach(seat => {
                const row = seat.seatNumber.charCodeAt(0) - 65;
                const col = parseInt(seat.seatNumber.substring(1)) - 1;
                show.seats[row][col] = "booked";
            });

            show.markModified("seats");
            await show.save({ session });

            await User.findByIdAndUpdate(userId, {
                $push: { bookings: bookingId }
            }).session(session);

            await session.commitTransaction();
            session.endSession();

            // Format dateTime for display
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

            console.log("Mock payment completed successfully");
            await sendEmail(user.email, "booking", bookingDetails);

            return res.status(200).json({ message: "Mock payment verified, booking confirmed!" });
        }

        // Real Razorpay signature verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            booking.status = "booked";
            booking.selectedSeats.forEach(seat => seat.status = "booked");
            await booking.save({ session });

            const payment = await Payment.findOne({ razorpay_order_id }).session(session);
            if (payment) {
                payment.status = "completed";
                payment.razorpay_payment_id = razorpay_payment_id;
                payment.razorpay_signature = razorpay_signature;
                await payment.save({ session });
            }

            booking.selectedSeats.forEach(seat => {
                const row = seat.seatNumber.charCodeAt(0) - 65;
                const col = parseInt(seat.seatNumber.substring(1)) - 1;
                show.seats[row][col] = "booked";
            });

            show.markModified("seats");
            await show.save({ session });

            await User.findByIdAndUpdate(userId, {
                $push: { bookings: bookingId }
            }).session(session);

            await session.commitTransaction();
            session.endSession();

            // Format dateTime for display
            const showDateTime = new Date(show.dateTime);
            const showDate = showDateTime.toDateString(); 
            const showTime = showDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); 

            const bookingDetails = {
                movieName: show.movieId.title,
                theaterName: show.theaterId.name,
                poster:show.movieId.verticalImg,
                location: show.theaterId.location, 
                showTime: showTime, 
                showDate: showDate, 
                selectedSeats: booking.selectedSeats.map(seat => seat.seatNumber),
                totalPrice: booking.totalPrice,
            };
            console.log("Poster URL:", show.movieId.verticalImg);

            await sendEmail(user.email, "booking", bookingDetails);

            return res.status(200).json({ message: "Payment verified, booking confirmed!" });
        } else {
            return res.status(400).json({ message: "Payment verification failed" });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Error verifying payment", error: error.message });
    }
};
