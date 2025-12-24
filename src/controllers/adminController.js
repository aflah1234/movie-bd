import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
import generateToken from "../utils/token.js";
import crypto from "crypto";
import cloudinaryUpload from "../utils/cloudinaryUploader.js";

const NODE_ENV = process.env.NODE_ENV





// ------------admin Signup------------
export const signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Name, email, password, and role are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        if (!['admin', 'theaterOwner'].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'theaterOwner'" });
        }        

        let admin = await Admin.findOne({ email });

        if (admin) {
            if (!admin.isVerified) {
                // If user exists but is not verified, update their details and verify them
                admin.name = name;
                admin.password = await bcrypt.hash(password, 10);
                admin.role = role;
                admin.isVerified = true;
                admin.otp = null;
                admin.otpExpires = null;
                await admin.save();
                return res.json({ message: "Registration successful (OTP verification skipped)." });
            }
            return res.status(400).json({ message: "Admin already exists and is verified" });
        }

        // Create a new admin - always skip OTP verification
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newAdmin = new Admin({
            name,
            email,
            password: hashedPassword,
            role,
            isVerified: true // Always set to true to skip OTP
        });
        
        await newAdmin.save();
        return res.json({ message: "Registration successful (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in admin signup:", error);
        
        // More detailed error handling
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Validation error", 
                details: error.message 
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: "Email already exists" 
            });
        }
        
        if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
            return res.status(503).json({ 
                message: "Database connection error" 
            });
        }
        
        res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



// ------------otp verification (SKIPPED)------------
export const verifyOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: "Admin not found" });
        }

        // Always verify the admin (skip OTP check)
        admin.isVerified = true;
        admin.otp = null;
        admin.otpExpires = null;
        await admin.save();

        res.json({ message: "Registration successful (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in verifying OTP", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// -----------Resent OTP (SKIPPED)------------
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: "Admin not found" });
        }

        if (admin.isVerified) {
            return res.status(400).json({ message: "Admin is already verified." });
        }

        // Auto-verify the admin (skip OTP resend)
        admin.isVerified = true;
        admin.otp = null;
        admin.otpExpires = null;
        await admin.save();

        res.json({ message: "Admin verified successfully (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in resending OTP", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// -----------admin login------------
export const login = async (req, res) => {

    try {
        
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: "admin not found" });
        }

        if (admin.isVerified === false) {
            // Auto-verify the admin (skip OTP verification)
            console.log('🚀 Auto-verifying admin: Skipping email verification');
            admin.isVerified = true;
            await admin.save();
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        } 

        // Generate Token----------
        const token = generateToken(admin._id, admin.role);

        // Cookie settings for production deployment
        const cookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: NODE_ENV === "production" ? "None" : "Lax",
            secure: NODE_ENV === "production",
            path: "/"
        };

        res.cookie("token", token, cookieOptions);

        console.log('✅ Admin logged in successfully:', admin.email);
        console.log('🍪 Cookie set with options:', cookieOptions);

        res.status(200).json({ 
            message: "Login successful",
            data: {
                _id: admin._id, 
                name: admin.name, 
                email: admin.email, 
                role: admin.role, 
                profilePic: admin.profilePic
            } 
        });

    } catch (error) {
     console.error("Error in login",error);
     res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });   
    }
};




// -----------Forgot Password------------
export const forgotPassword = async (req, res) => {

    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: "User not found" });
        }

        let role;

        if (admin.role === "admin") {
            role = "admin";
        } else if (admin.role === "theaterOwner") {
            role = "owner";
        }
        

        // --- Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // --- Hash the token before saving
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        admin.resetPasswordToken = hashedToken;
        admin.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 min

        await admin.save();

        // --- Create reset password URL
        const resetUrl = `https://lock-my-seat.vercel.app/${role}/reset-password/${resetToken}`;

        // --- Send email with reset link
        await sendEmail(email, "reset", { resetUrl });

        res.status(200).json({ message: "Password reset link sent to your email." });

    } catch (error) {
        console.error("Error in forgotPassword", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// -----------Reset Password------------
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        if (!token) {
            return res.status(400).json({ message: "Token required" });
        }

        if (!newPassword) {
            return res.status(400).json({ message: "New password required" });
        }

        // --- Hash the received token
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // --- Find the user with the token & check if it's expired
        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!admin) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // --- Hash the new password before saving
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);

        // --- Remove reset token from DB
        admin.resetPasswordToken = null;
        admin.resetPasswordExpires = null;

        await admin.save();

        res.status(200).json({ message: "Password reset successful" });

    } catch (error) {
        console.error("Error in resetPassword", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// -----------Update Profile------------
export const updateProfile = async (req, res) => {
    const { name, profilePic } = req.body;
    const userId = req.user.userId;

    try {

        const admin = await Admin.findById(userId);

        if (!admin) {
            return res.status(400).json({ message: "User not found" });
        }

        if(name){
            const nameExists = await Admin.findOne({ name });
            if (nameExists && nameExists._id.toString() !== userId) {
                return res.status(400).json({ message: "Username already taken" });
            }
            admin.name = name;
        }

        if (req.file) {
            admin.profilePic = await cloudinaryUpload(req.file.path);
        }

        await admin.save();

        res.status(200).json({ message: "Profile updated successfully", data: { _id: admin._id, name: admin.name, email: admin.email, profilePic: admin.profilePic, role: admin.role} });

    } catch (error) {
        console.error("Error in updateProfile",error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};


export const checkTheaterOwner = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (req.user.role !== "theaterOwner") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const owner = await Admin.findById(userId);

        if (!owner) {
            return res.status(400).json({ message: "Theater owner not found" });
        }

        res.status(200).json({
            message: "Owner authorized",
            data: { _id: owner._id, name: owner.name, email: owner.email, profilePic: owner.profilePic, role: owner.role, status: owner.isActive, isVerified: owner.isVerified, createdAt: owner.createdAt }
        });

    } catch (error) {
        console.error("Error in checkTheaterOwner controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




export const getAdmin = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const admin = await Admin.findById(userId);

        if (!admin) {
            return res.status(400).json({ message: "Admin not found" });
        }

        res.status(200).json({
            message: "admin authorized",
            data: { _id: admin._id, name: admin.name, email: admin.email, profilePic: admin.profilePic, role: admin.role, status: admin.isActive, isVerified: admin.isVerified, createdAt: admin.createdAt }
        });

    } catch (error) {
        console.error("Error in getAdmin controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};

