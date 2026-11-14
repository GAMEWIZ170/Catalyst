const mongoose = require('mongoose');
const avatarKeys = require("../config/avatars");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    avatar: {
        type: String,
        enum: avatarKeys,
        default: null
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    // Students have access until this date when REQUIRE_SUBSCRIPTION=true. Set by an admin.
    subscriptionEndsAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // False only for accounts created through register, until the student finishes or skips the welcome steps.
    // Older accounts have no value and count as done.
    onboarded: {
        type: Boolean,
        default: true
    },
    // False only for accounts created through register, until the student opens the emailed link.
    // Older accounts have no value and count as verified. Unverified students are warned, not blocked.
    emailVerified: {
        type: Boolean,
        default: true
    },
    // Set when the password changes. Sessions that started before it stop working.
    passwordChangedAt: {
        type: Date,
        default: null
    },
    // Set when the student deletes the account. The row stays, with the personal data removed.
    deletedAt: {
        type: Date,
        default: null
    },
    examDate: {
        type: Date,
        default: null
    },
    // Optional daily goal. "minutes" counts study time, "lesson" counts a lesson finished today.
    dailyGoal: {
        kind: { type: String, enum: ["none", "minutes", "lesson"], default: "none" },
        minutes: { type: Number, min: 5, max: 240, default: 10 }
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;