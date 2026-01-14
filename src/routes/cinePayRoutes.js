import express from "express";
import { 
    createCinePayTransaction, 
    processCinePayPayment,
    getCinePayTransactionStatus 
} from "../controllers/cinePayController.js";
import checkAuth from "../middlewares/checkAuth.js";

const router = express.Router();

// Debug route
router.get('/debug-auth', (req, res) => {
    const token = req.cookies.token;
    res.json({
        message: "CinePay route debug",
        authentication: {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + "..." : null,
            cookies: Object.keys(req.cookies)
        },
        timestamp: new Date().toISOString()
    });
});

// Create transaction
router.post('/createTransaction', checkAuth, createCinePayTransaction);

// Process payment
router.post('/processPayment', checkAuth, processCinePayPayment);

// Get transaction status
router.get('/status/:transactionId', checkAuth, getCinePayTransactionStatus);

export default router;
