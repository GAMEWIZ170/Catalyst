const mongoose = require("mongoose");
const { findVisibleLesson } = require("../utils/visibility");
const Lesson = require("../models/lesson.models");

// Short share links for WhatsApp and other chat apps: /s/c/<challenge>, /s/i/<friend code>, /s/l/<lesson>, /s/s/<set>.
// The app is a single-page app, so a chat app cannot read its titles. This route answers with a tiny page that has the
// preview tags (title, description, image) and then sends the person into the app. It needs no sign-in, so it never
// shows an answer, a name, a score or anything private: only a generic line, or a published lesson's title.
const APP_NAME = "Catalyst";
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

const appOrigin = () => String(process.env.CLIENT_URL || "").replace(/\/$/, "");

const page = ({ title, description, to, url }) => {
  const origin = appOrigin();
  const target = `${origin}${to}`;
  const image = `${origin}/icons/icon-512.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${APP_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
</head>
<body>
<p><a href="${escapeHtml(target)}">Open ${APP_NAME}</a></p>
</body>
</html>`;
};

const send = (req, res, content) => {
  res.set("Cache-Control", "public, max-age=300");
  res.type("html").status(200).send(page({ ...content, url: `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}` }));
};

const isId = (id) => mongoose.isObjectIdOrHexString(id);
const SIGN_IN = { title: `${APP_NAME}`, description: "Sign in to view this." };

const challengeLink = (req, res) => {
  if (!isId(req.params.id)) return res.status(404).type("text").send("Not found");
  return send(req, res, { title: "A friend challenged you on Catalyst", description: "Can you beat the score? Sign in to play.", to: `/challenge/${req.params.id}` });
};

const inviteLink = (req, res) => {
  if (!/^[A-Za-z0-9]{6,12}$/.test(req.params.id)) return res.status(404).type("text").send("Not found");
  return send(req, res, { title: "Study with me on Catalyst", description: "Add me as a friend on Catalyst. Sign in to accept.", to: `/friends?code=${req.params.id.toUpperCase()}` });
};

// Only a published lesson shows its title. Anything else gets the generic line, so a draft's name never leaks.
const lessonLink = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).type("text").send("Not found");
    const lesson = await findVisibleLesson(req.params.id);
    const full = lesson ? await Lesson.findById(lesson._id).select("title").lean() : null;
    return send(req, res, full
      ? { title: `${full.title} on Catalyst`, description: "A lesson on Catalyst. Sign in to read it.", to: `/lessons/${req.params.id}` }
      : { ...SIGN_IN, to: "/home" });
  } catch (error) {
    next(error);
  }
};

// Study sets are private, so the preview never says what is in one.
const setLink = (req, res) => {
  if (!isId(req.params.id)) return res.status(404).type("text").send("Not found");
  return send(req, res, { ...SIGN_IN, to: "/lab" });
};

module.exports = { challengeLink, inviteLink, lessonLink, setLink, escapeHtml };
