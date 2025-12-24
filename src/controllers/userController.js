import User from "../models/userModel.js";
import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
import generateToken from "../utils/token.js";
import crypto from "crypto";
import cloudinaryUpload from "../utils/cloudinaryUploader.js";
import nodemailer from "nodemailer";
const NODE_ENV = process.env.NODE_ENV


// ------------User Signup------------
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        let user = await User.findOne({ email });

        if (user) {
            if (!user.isVerified) {
                // If user exists but is not verified, update their details and verify them
                user.name = name;
                user.password = await bcrypt.hash(password, 10);
                user.isVerified = true;
                user.otp = null;
                user.otpExpires = null;
                await user.save();
                return res.json({ message: "Registration successful (OTP verification skipped)." });
            }
            return res.status(400).json({ message: "User already exists and is verified" });
        }

        // Create a new user - always skip OTP verification
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            isVerified: true // Always set to true to skip OTP
        });
        
        await newUser.save();
        return res.json({ message: "Registration successful (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in signup:", error);
        
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

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Always verify the user (skip OTP check)
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ message: "Registration successful (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in verifying OTP", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// -----------Resent OTP------------
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "User is already verified." });
        }

        // Auto-verify the user (skip OTP resend)
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ message: "User verified successfully (OTP verification skipped)." });

    } catch (error) {
        console.error("Error in resending OTP", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// -----------user login------------
export const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check account is deactivated
        if (user.isActive === false) {
            return res.status(403).json({ message: "Sorry, your account has been deactivated by admin." });
        }

        // Check if email is verified (always skip verification)
        if (user.isVerified === false) {
            // Auto-verify the user (skip OTP verification)
            console.log('🚀 Auto-verifying user: Skipping email verification');
            user.isVerified = true;
            await user.save();
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate Token---------
        const token = generateToken(user._id);

        // Cookie settings for production deployment
        const cookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: NODE_ENV === "production" ? "None" : "Lax",
            secure: NODE_ENV === "production",
            path: "/",
            domain: NODE_ENV === "production" ? undefined : undefined // Let browser handle domain
        };

        res.cookie("token", token, cookieOptions);

        console.log('✅ User logged in successfully:', user.email);
        console.log('🍪 Cookie set with options:', cookieOptions);
        console.log('🌐 NODE_ENV:', NODE_ENV);
        console.log('🔗 Request origin:', req.get('origin'));

        res.status(200).json({ 
            message: "Login successful", 
            data: { 
                _id: user._id, 
                name: user.name, 
                email: user.email, 
                profilePic: user.profilePic 
            } 
        });

    } catch (error) {
        console.error("Error in login", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// -----------user logout------------
export const logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            sameSite: NODE_ENV === "production" ? "None" : "Lax",
            secure: NODE_ENV === "production",
            httpOnly: NODE_ENV === "production",
        });

        res.json({ message: "Logout successful" });
    } catch (error) {
        console.error("Error in logout", error);
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

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // --- Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // --- Hash the token before saving
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 min

        await user.save();

        // --- Create reset password URL
        const resetUrl = `https://lock-my-seat.vercel.app/reset-password/${resetToken}`;

        // --- Send email with reset link
        await sendEmail(email, "reset", { resetUrl });

        res.status(200).json({ message: "Password reset link sent to your email." });

    } catch (error) {
        console.error("Error in forgotPassword", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// ------------ Reset Password (Update Password) ------------
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        // --- Hash the received token
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // --- Find the user with the token & check if it's expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // --- Hash the new password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // --- Remove reset token from DB
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

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
    const role = req.user.role;

    try {
        // for role based access
        const Model = role === 'admin' || role === 'theaterOwner' ? Admin : User;
        const user = await Model.findById(userId);

        if (!user) {
            return res.status(400).json({ message: `${role} not found` });
        }

        if (name) {
            const nameExists = await Model.findOne({ name });
            if (nameExists && nameExists._id.toString() !== userId) {
                return res.status(400).json({ message: "Username already taken" });
            }
            user.name = name;
        }

        if (req.file) {
            user.profilePic = await cloudinaryUpload(req.file.path);
        }

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic
            }
        });

    } catch (error) {
        console.error("Error in updateProfile", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};





// -------------check user------------
export const checkUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "user authorized",
            data: { _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic, role: user.role, status: user.isActive, isVerified: user.isVerified, createdAt: user.createdAt }
        });

    } catch (error) {
        console.error("Error in checkUser controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// -------------get all users------------
export const getAllUsers = async (req, res) => {
    try {

        const users = await User.find({isVerified: true});

        if (!users) {
            return res.status(404).json({ message: "No users found" });
        }

        const totalUser = users.length;
        res.status(200).json({ message: "Users found", data: totalUser, users });

    } catch (error) {
        console.error("Error in getAllUsers controller", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// -----------User account deactivation and activation------------
export const isActiveToggle = async (req, res) => {
    const { userId } = req.params

    try {

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({ message: `User ${user.isActive ? "activated" : "deactivated"} successfully` });

    } catch (error) {
        console.log("Error in isActiveToggle", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};




// -----------User contact form------------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const contact = async (req, res) => {
    const { name, email, message } = req.body;

    const mailOptions = {
        from: email,
        to: "cinebook@gmail.com",
        subject: `New Contact Message from ${name}`,
        text: `You received a new message:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error sending email." });
        console.log("Error in contact", error);
    }
};
