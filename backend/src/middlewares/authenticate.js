const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
const authCache = require("../utils/authCache");

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Please log in to continue" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = authCache.get(decoded.id);
    if (!user) {
      user = await User.findById(decoded.id).select("role isActive subscriptionEndsAt passwordChangedAt").lean();
      if (user) authCache.set(decoded.id, user);
    }
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Please log in to continue" });
    }
    // A password change or reset ends every session that started before it. iat is in whole seconds.
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: "Your session is invalid or has expired. Please log in again" });
    }

    req.user = { id: user._id.toString(), role: user.role, subscriptionEndsAt: user.subscriptionEndsAt };
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