import express from "express";
import { createBooking, getTotalBookings, getUserBookings, markPaymentReceived } from "../controllers/bookingController.js";
import checkAuth from "../middlewares/checkAuth.js";
import checkOwnerAdmin from "../middlewares/checkOwnerAdmin.js";
const router = express.Router();

router.post('/create', checkAuth, createBooking)
router.get('/all-bookings', checkAuth, getUserBookings)
router.get('/total-bookings', checkAuth, getTotalBookings)
router.put('/mark-payment-received/:bookingId', checkOwnerAdmin, markPaymentReceived)



export default router