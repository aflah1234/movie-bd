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

        // Create booking with pending status (awaiting payment)
        const newBooking = new Booking({
            showId,
            userId,
            selectedSeats: selectedSeats.map(seat => ({ seatNumber: seat, status: "pending" })),
            totalPrice,
            status: "pending", // Pending until payment is completed
            paymentStatus: "pending",
            paymentMethod: "cinepay",
            createdAt: new Date()
        });

        await newBooking.save({ session });

        // Don't update seat availability yet - wait for payment
        // Seats will be marked as booked after successful payment

        await session.commitTransaction();
        session.endSession();

        // Format booking details for response
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
            status: "pending"
        };

        res.status(201).json({
            message: "Booking created successfully! Please complete payment.",
            booking: bookingDetails
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating booking:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        res.status(500).json({ 
            message: "Error creating booking",
            error: error.message 
        });
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
            return res.status(200).json({ message: "No bookings found", data: [] });
        }


        // ----formatted for good structure and readability----
        const formattedBookings = bookings
            .filter(booking => booking.showId && booking.showId.movieId && booking.showId.theaterId) // Exclude deleted shows/movies/theaters
            .map(booking => ({
                bookingId: booking._id,
                movieId: booking.showId.movieId._id,
                movieName: booking.showId.movieId.title,
                moviePoster: booking.showId.movieId.verticalImg,
                movieImage: booking.showId.movieId.verticalImg,
                theaterName: booking.showId.theaterId.name,
                showDate: booking.showId.dateTime.toDateString(),
                showTime: booking.showId.dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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