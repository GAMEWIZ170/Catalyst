// requireAccess.js: when REQUIRE_SUBSCRIPTION=true, students need an active subscription
// to open lessons, tests, flashcards and materials. Admins always have access.
// Browsing courses and viewing progress stay open. With the setting off, everyone has access.
const hasAccess = (user) =>
  process.env.REQUIRE_SUBSCRIPTION !== "true" ||
  user.role === "admin" ||
  Boolean(user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date());

const requireAccess = (req, res, next) => {
  if (hasAccess(req.user)) return next();
  return res.status(403).json({
    message: "Your access has ended. Contact Catalyst to renew it.",
    code: "SUBSCRIPTION_REQUIRED"
  });
};

module.exports = requireAccess;
module.exports.hasAccess = hasAccess;
