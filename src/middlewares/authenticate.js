const jwt = require("jsonwebtoken");
const User = require("../models/user.models");

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Please log in to continue" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("role isActive");
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Please log in to continue" });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your session is invalid or has expired. Please log in again"
      });
    }
    next(error);
  }
};

module.exports = authenticate;