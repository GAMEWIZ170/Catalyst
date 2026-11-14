const { logEvent } = require("../utils/events");

// The browser can report only things the server cannot see by itself.
const CLIENT_TYPES = ["video_started", "focus_session_completed"];

const addEvent = (req, res) => {
  // Admins preview lessons as students. Those views are not student activity.
  if (req.user.role === "student") logEvent(req.user.id, req.body.type, req.body.props);
  return res.status(204).end();
};

module.exports = { addEvent, CLIENT_TYPES };
