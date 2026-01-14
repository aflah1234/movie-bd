import Stripe from "stripe";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";
import mongoose from "mongoose";
import Show from "../models/showModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";

const STRIPE_MODE = process.env.STRIPE_MODE || 'test';

function validateStripeKeys() {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';

    if (!secretKey) {
        console.warn('Stripe secret key is not set. Stripe payment endpoints will not work without it.');
        return;
    }

    if (secretKey.includes('your_') || secretKey.includes('sk_test_')) {
        console.warn('Stripe key appears to be a placeholder or test key.');
        return;
    }

    if (STRIPE_MODE === 'test' && !secretKey.startsWith('sk_test_')) {
        throw new Error('STRIPE_MODE is set to "test" but provided key does not appear to be a Stripe test key (should start with "sk_test_").');
    }

    if (STRIPE_MODE === 'live' && !secretKey.startsWith('sk_live_')) {
        throw new Error('STRIPE_MODE is set to "live" but provided key does not appear to be a Stripe live key (should start with "sk_live_").');
    }
}

validateStripeKeys();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const createStripePaymentIntent = async (req, res) => {
    const { amount, bookingId } = req.body;
    
    console.log('🔍 Stripe Payment createPaymentIntent - Auth debug:', {
        hasUser: !!req.user,
        userId: req.user?.userId,
        cookies: Object.keys(req.cookies),
        hasToken: !!req.cookies.token,
        origin: req.get('origin')
    });
    
    const userId = req.user.userId;

    try {
        console.log('Stripe payment request received:', { amount, bookingId, userId });

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
            
            if (existingPayment.status === 'pending' && existingPayment.stripe_payment_intent_id) {
                console.log('Returning existing pending payment intent');
                return res.status(200).json({
                    message: "Using existing payment intent",
                    clientSecret: existingPayment.stripe_client_secret,
                    paymentIntentId: existingPayment.stripe_payment_intent_id,
                    amount: existingPayment.amount * 100,
                    existing: true
                });
            }
            
            if (existingPayment.status === 'completed') {
                return res.status(400).json({ message: "Payment already completed for this booking" });
            }
        }

        // Skip payment in development mode
        if (process.env.SKIP_PAYMENT_IN_DEV === 'true') {
            const mockPaymentIntentId = `mock_pi_${Date.now()}`;
            const mockClientSecret = `mock_secret_${Date.now()}`;
            
            const payment = new Payment({
                stripe_payment_intent_id: mockPaymentIntentId,
                stripe_client_secret: mockClientSecret,
                userId,
                amount,
                bookingId,
                status: "pending",
                paymentGateway: "stripe"
            });

            await payment.save();
            console.log("Mock Stripe payment created for development");

            return res.status(200).json({
                message: "Mock payment intent created successfully (development mode)",
                clientSecret: mockClientSecret,
                paymentIntentId: mockPaymentIntentId,
                amount: amount * 100,
                mock: true
            });
        }

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to smallest currency unit (cents/paise)
            currency: "inr",
            metadata: {
                bookingId: bookingId.toString(),
                userId: userId.toString()
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        if (!paymentIntent || !paymentIntent.id) {
            return res.status(500).json({ message: "Failed to create Stripe payment intent" });
        }

        const payment = new Payment({
            stripe_payment_intent_id: paymentIntent.id,
            stripe_client_secret: paymentIntent.client_secret,
            userId,
            amount,
            bookingId,
            status: "pending",
            paymentGateway: "stripe"
        });

        await payment.save();
        console.log("Stripe payment saved successfully");

        res.status(200).json({
            message: "Payment intent created successfully",
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
        });
    } catch (error) {
        console.error("Error in createStripePaymentIntent controller:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};

export const stripePaymentVerification = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentIntentId, bookingId } = req.body;
        const userId = req.user.userId;

        if (!paymentIntentId || !bookingId) {
            return res.status(400).json({ message: "Invalid payment details" });
        }

        const booking = await Booking.findById(bookingId).session(session);
        if (!booking || booking.userId.toString() !== req.user.userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

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
        if (process.env.SKIP_PAYMENT_IN_DEV === 'true' && paymentIntentId.startsWith('mock_pi_')) {
            console.log('Processing mock Stripe payment verification');
            
            booking.status = "booked";
            booking.selectedSeats.forEach(seat => seat.status = "booked");
            await booking.save({ session });

            const payment = await Payment.findOne({ stripe_payment_intent_id: paymentIntentId }).session(session);
            if (payment) {
                payment.status = "completed";
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

            console.log("Mock Stripe payment completed successfully");
            await sendEmail(user.email, "booking", bookingDetails);

            return res.status(200).json({ message: "Mock Stripe payment verified, booking confirmed!" });
        }

        // Real Stripe payment verification
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            booking.status = "booked";
            booking.selectedSeats.forEach(seat => seat.status = "booked");
            await booking.save({ session });

            const payment = await Payment.findOne({ stripe_payment_intent_id: paymentIntentId }).session(session);
            if (payment) {
                payment.status = "completed";
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

            await sendEmail(user.email, "booking", bookingDetails);

            return res.status(200).json({ message: "Stripe payment verified, booking confirmed!" });
        } else {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Payment verification failed - payment not completed" });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error verifying Stripe payment:", error);
        res.status(500).json({ message: "Error verifying payment", error: error.message });
    }
};
