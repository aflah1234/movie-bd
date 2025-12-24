import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import mongoose from "mongoose";


export const createBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { showId, selectedSeats, totalPrice } = req.body;
        const userId = req.user.userId;

        if (!showId || !selectedSeats || !totalPrice || !userId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const show = await Show.findById(showId)
            .populate("movieId", "title verticalImg")
            .populate("theaterId", "name location")
            .session(session);
            
        if (!show) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Show not found" });
        }

        // Check if seats are still available
        const unavailableSeats = [];
        selectedSeats.forEach(seatId => {
            const row = seatId.charCodeAt(0) - 65;
            const col = parseInt(seatId.substring(1)) - 1;
            if (show.seats[row] && show.seats[row][col] === "booked") {
                unavailableSeats.push(seatId);
            }
        });

        if (unavailableSeats.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                message: `Seats ${unavailableSeats.join(", ")} are no longer available` 
            });
        }

        // Create booking with confirmed status (skip online payment)
        const newBooking = new Booking({
            showId,
            userId,
            selectedSeats: selectedSeats.map(seat => ({ seatNumber: seat, status: "booked" })),
            totalPrice,
            status: "booked", // Direct confirmation - payment to be collected at theater
            paymentStatus: "pending", // Payment pending at theater
            paymentMethod: "theater_counter", // Payment method is theater counter
            createdAt: new Date()
        });

        await newBooking.save({ session });

        // Update seat availability in show
        selectedSeats.forEach(seatId => {
            const row = seatId.charCodeAt(0) - 65;
            const col = parseInt(seatId.substring(1)) - 1;
            show.seats[row][col] = "booked";
        });

        show.markModified("seats");
        await show.save({ session });

        // Add booking to user's bookings
        await User.findByIdAndUpdate(userId, {
            $push: { bookings: newBooking._id }
        }).session(session);

        await session.commitTransaction();
        session.endSession();

        // Format booking details for response and email
        const showDateTime = new Date(show.dateTime);
        const showDate = showDateTime.toDateString();
        const showTime = showDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const bookingDetails = {
            bookingId: newBooking._id,
            movieName: show.movieId.title,
            theaterName: show.theaterId.name,
            poster: show.movieId.verticalImg,
            location: show.theaterId.location,
            showTime: showTime,
            showDate: showDate,
            selectedSeats: selectedSeats,
            totalPrice: totalPrice,
            status: "booked"
        };

        // Send booking confirmation email (existing ticket logic)
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                await sendEmail(user.email, "booking", bookingDetails);
            }
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't fail the booking if email fails
        }

        res.status(201).json({
            message: "Booking confirmed successfully! Payment can be made at the theater.",
            booking: bookingDetails
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Error creating booking" });
    }
};







// --------------get all bookings of specific use------------
export const getUserBookings = async (req, res) => {

    const userId = req.user.userId;

    try {

        if (!userId) {
            return res.status(400).json({ message: "User id is required" });
        }

        const bookings = await Booking.find({ userId })
            .populate({
                path: "showId",
                select: "movieId theaterId dateTime",
                populate: [
                    { path: "movieId", select: "title verticalImg" },
                    { path: "theaterId", select: "name location" }
                ]
            })
            .select("showId selectedSeats status paymentStatus paymentMethod totalPrice createdAt")
            .sort({ createdAt: -1 }); 

        if (!bookings.length) {
            return res.status(404).json({ message: "No bookings found" });
        }


        // ----formatted for good structure and readability----
        const formattedBookings = bookings.filter(booking => booking.showId) // Exclude deleted shows
            .map(booking => ({
                bookingId: booking._id,
                movieId: booking.showId.movieId._id,
                movieName: booking.showId.movieId.title,
                moviePoster: booking.showId.movieId.verticalImg,
                movieImage: booking.showId.movieId.verticalImg,
                theaterName: booking.showId.theaterId.name,
                showDate: booking.showId.dateTime.toDateString(),
                showTime: booking.showId.dateTime.toTimeString(),
                bookedSeats: booking.selectedSeats.map(seat => seat.seatNumber),
                status: booking.status,
                paymentStatus: booking.paymentStatus || 'pending',
                paymentMethod: booking.paymentMethod || 'theater_counter',
                totalPrice: booking.totalPrice
            }));

        res.status(200).json({ message: "Bookings found", data: formattedBookings });

    } catch (error) {
        console.error("Error in getUserBookings controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// --------------get total bookings------------
export const getTotalBookings = async (req, res) => {

    try {

        const totalBookings = await Booking.countDocuments({});

        if (!totalBookings.length) {
            return res.status(404).json({ message: "No bookings found" });
        }

        res.status(200).json({ message: "Total bookings found", data: totalBookings });

    } catch (error) {
        console.error("Error in getTotalBookings controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// --------------mark payment as received at theater------------
export const markPaymentReceived = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.userId;

        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Update payment status
        booking.paymentStatus = "paid_at_theater";
        await booking.save();

        res.status(200).json({ 
            message: "Payment marked as received", 
            booking: {
                bookingId: booking._id,
                paymentStatus: booking.paymentStatus,
                paymentMethod: booking.paymentMethod
            }
        });

    } catch (error) {
        console.error("Error marking payment as received:", error);
        res.status(500).json({ message: "Error updating payment status" });
    }
};