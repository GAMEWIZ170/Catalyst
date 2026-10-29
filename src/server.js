require("dotenv").config();


if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
  throw new Error("JWT_SECRET and JWT_EXPIRES_IN must be set in .env");
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