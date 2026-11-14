// sendEmail.js: the one place that sends mail. Real sending is not built yet.
// In development it prints the message to the server console, so the owner can click the link.
// In production it throws, so a missing mail setup shows up as an error instead of silently lost links.
const sendEmail = async ({ to, subject, text }) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Email sending is not set up yet");
  }
  console.log(`\n--- EMAIL (development only, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n------------------------------------------\n`);
};

module.exports = sendEmail;
