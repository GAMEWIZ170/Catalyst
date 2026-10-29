// src/controllers/admin.controller.js
const User = require("../models/user.models");

const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    // The limit is capped at 100, one of the two fixes I suggested for the old code
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const [users, total] = await Promise.all([
      User.find()
        .select("name email role isActive createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments()
    ]);

    return res.status(200).json({
      data: users,
      pagination: {
        currentPage: page,
        limit,
        totalUsers: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers };