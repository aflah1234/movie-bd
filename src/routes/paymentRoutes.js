import express from "express";
import { createOrder, paymentVerification } from "../controllers/paymentController.js";
import checkAuth from "../middlewares/checkAuth.js";
const router = express.Router();

// Debug route without authentication
router.get('/debug-auth', (req, res) => {
    const token = req.cookies.token;
    res.json({
        message: "Payment route debug",
        authentication: {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + "..." : null,
            cookies: Object.keys(req.cookies),
            allCookies: req.cookies
        },
        headers: {
            origin: req.get('origin'),
            userAgent: req.get('user-agent')?.substring(0, 50),
            cookie: req.get('cookie')?.substring(0, 100)
        },
        timestamp: new Date().toISOString()
    });
});

router.post('/createOrder', checkAuth, createOrder)
router.post('/paymentVerification', checkAuth, paymentVerification)

export default router