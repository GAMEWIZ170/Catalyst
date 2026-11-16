const mongoose = require("mongoose");

const sideSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 500 },
  image: {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: 200 },
    width: Number,
    height: Number
  }
}, { _id: false });

const flashcardSchema = new mongoose.Schema({
  // A card belongs to a lesson (admin) or to a student's study set, never both.
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", default: null },
  front: { type: sideSchema, required: true },
  back: { type: sideSchema, required: true },
  order: { type: Number, required: true, min: 1 },
  isPublished: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

flashcardSchema.index({ lesson: 1, order: 1 });
flashcardSchema.index({ set: 1, order: 1 });

const validateSide = (side, path, invalidate) => {
  if (!side || (!side.text && !(side.image && side.image.url))) {
    invalidate(path, "Each flashcard side needs text or an image");
  }
  if (side.image && side.image.url && !side.image.alt) {
    invalidate(`${path}.image`, "Image alt text is required when a URL is provided");
  }
};

flashcardSchema.pre("validate", function () {
  if (Boolean(this.lesson) === Boolean(this.set)) this.invalidate("lesson", "A flashcard belongs to a lesson or a study set");
  validateSide(this.front, "front", (path, message) => this.invalidate(path, message));
  validateSide(this.back, "back", (path, message) => this.invalidate(path, message));
});

module.exports = mongoose.model("Flashcard", flashcardSchema);
