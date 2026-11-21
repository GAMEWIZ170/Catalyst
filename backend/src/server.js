// Use public DNS for this Node process. The local network's DNS times out on the
// SRV/TXT lookups that a mongodb+srv:// connection string needs.
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();


if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN || !process.env.CLOUDINARY_URL) {
  throw new Error("JWT_SECRET, JWT_EXPIRES_IN and CLOUDINARY_URL must be set in .env");
}

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();