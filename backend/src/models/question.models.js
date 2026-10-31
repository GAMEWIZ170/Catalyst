const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
  publicId: { type: String, trim: true },
  alt: { type: String, trim: true, maxlength: 200 }
}, { _id: false });

const optionSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 300 },
  image: { type: imageSchema, default: null }
});

const questionSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  type: { type: String, enum: ["mcq", "true_false"], required: true },
  text: { type: String, required: true, trim: true, maxlength: 1500 },
  image: { type: imageSchema, default: null },
  options: { type: [optionSchema], default: [] },
  correctOption: { type: mongoose.Schema.Types.ObjectId, default: null },
  correctAnswer: { type: String, enum: ["true", "false"], default: null },
  explanation: { type: String, default: "", trim: true, maxlength: 4000 },
  explanationImage: { type: imageSchema, default: null },
  order: { type: Number, required: true, min: 1 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

questionSchema.index({ test: 1, order: 1 });

const validateImage = (image, path, invalidate) => {
  if (!image) return;
  if (image.url && !image.alt) invalidate(path, "Image alt text is required when a URL is provided");
};

questionSchema.pre("validate", function () {
  if (!this.test) this.invalidate("test", "A question must belong to a test");
  validateImage(this.image, "image", (path, message) => this.invalidate(path, message));
  validateImage(this.explanationImage, "explanationImage", (path, message) => this.invalidate(path, message));

  if (this.type === "mcq") {
    if (this.options.length < 2 || this.options.length > 6) {
      this.invalidate("options", "A multiple choice question needs 2 to 6 options");
    }
    this.options.forEach((option, index) => {
      if (!option.text && !(option.image && option.image.url)) {
        this.invalidate(`options.${index}`, "Each option needs text or an image");
      }
      validateImage(option.image, `options.${index}.image`,
        (path, message) => this.invalidate(path, message));
    });
    if (!this.correctOption || !this.options.some((option) => option._id.equals(this.correctOption))) {
      this.invalidate("correctOption", "The correct option must be one of the options");
    }
    if (this.correctAnswer != null) {
      this.invalidate("correctAnswer", "Multiple choice questions cannot have correctAnswer");
    }
  }

  if (this.type === "true_false") {
    if (this.options.length !== 0) this.invalidate("options", "True/false questions cannot have options");
    if (!["true", "false"].includes(this.correctAnswer)) {
      this.invalidate("correctAnswer", "A true/false answer must be true or false");
    }
    if (this.correctOption != null) {
      this.invalidate("correctOption", "True/false questions cannot have correctOption");
    }
  }
});

module.exports = mongoose.model("Question", questionSchema);
