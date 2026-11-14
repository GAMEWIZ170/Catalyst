const Event = require("../models/event.models");

// Only plain ids, numbers, booleans and short words may go in props, so no personal data can slip in by accident.
const cleanProps = (props) => {
  const clean = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (typeof value === "number" || typeof value === "boolean") clean[key] = value;
    else if (typeof value === "string" && value.length <= 40) clean[key] = value;
    else if (value && typeof value.toString === "function" && /^[a-f0-9]{24}$/.test(String(value))) clean[key] = String(value);
  }
  return clean;
};

// Fire and forget: nothing waits for this and a failure is only logged, so it can never slow down or break a request.
const logEvent = (userId, type, props) => {
  try {
    Event.create({ user: userId, type, props: cleanProps(props) }).catch((error) => console.error("Event log failed:", error.message));
  } catch (error) {
    console.error("Event log failed:", error.message);
  }
};

module.exports = { logEvent, cleanProps };
