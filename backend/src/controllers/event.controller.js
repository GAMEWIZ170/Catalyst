const Event = require("../models/event.models");
const StudyTime = require("../models/studytime.models");
const { logEvent } = require("../utils/events");
const { dayKey } = require("../utils/day");

// The browser can report only things the server cannot see by itself.
const CLIENT_TYPES = ["video_started", "focus_session_completed"];
const FOCUS_CAP_MINUTES = 90; // counted focus minutes per day

// A finished focus session counts only for minutes the student was really active in Catalyst (the study timer
// reports those seconds), and never more than the daily cap. Returns the minutes that count, possibly 0.
const countedFocusMinutes = async (userId, timeZone, minutes) => {
  const day = dayKey(timeZone);
  const [studied, earlier] = await Promise.all([
    StudyTime.findOne({ user: userId, day }).select("seconds").lean(),
    Event.aggregate([
      { $match: { user: new (require("mongoose").Types.ObjectId)(userId), type: "focus_session_completed", "props.day": day } },
      { $group: { _id: null, total: { $sum: "$props.minutes" } } }
    ])
  ]);
  const already = earlier[0]?.total || 0;
  const active = Math.floor((studied?.seconds || 0) / 60);
  return Math.max(0, Math.min(minutes, FOCUS_CAP_MINUTES - already, active - already));
};

const addEvent = async (req, res, next) => {
  try {
    if (req.body.type === "focus_session_completed") {
      const minutes = await countedFocusMinutes(req.user.id, req.user.timeZone, req.body.props.minutes || 0);
      logEvent(req.user.id, "focus_session_completed", { minutes, day: dayKey(req.user.timeZone) });
      return res.status(200).json({ data: { counted: minutes } });
    }
    logEvent(req.user.id, req.body.type, req.body.props);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { addEvent, CLIENT_TYPES, FOCUS_CAP_MINUTES };
