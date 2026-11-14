const mongoose = require("mongoose");

// A subject area for courses, such as Chemistry or Coding. Courses with no category show under "General".
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
