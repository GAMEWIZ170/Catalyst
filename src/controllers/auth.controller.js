const User = require("../models/user.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const hashPassword = require("../utils/bcrypt");
const ms = require("ms");

// Helper function to generate JWT token and send cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const options = {
        expires: new Date(Date.now() + ms(process.env.JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000),
        httpOnly: true, // Prevents client-side JS from reading the cookie
        secure: process.env.NODE_ENV === 'production' // Use HTTPS in production
    };

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
           success: true,
           token, 
           data: {
               id: user._id,
               name: user.name,
               email: user.email,
               role: user.role
           }
       });
};

// 1. REGISTER
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        // Hash the password using your custom helper function
        const hashedPassword = await hashPassword(password);
        if (!hashedPassword) {
            return res.status(500).json({
                success: false,
                message: "Error hashing password"
            });
        }

        // Create the user
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'student' 
        });

        // Automatically log the student in by setting the login cookie
        sendTokenResponse(user, 201, res);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages[0] });
        }
        next(error);
    }
};

// 2. LOGIN
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide an email and password"
            });
        }

        // Normalize email for lookup
        const normalizedEmail = email.toLowerCase();

        // Find user 
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if password matches using standard bcrypt compare
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Set login cookie and respond
        sendTokenResponse(user, 200, res);

    } catch (error) {
        next(error);
    }
};

// 3. LOGOUT
const logout = async (req, res, next) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000), 
            httpOnly: true
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        next(error);
    }
};

// 4. GET ME
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('name email role');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe
};