const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
  publicId: { type: String, trim: true },
  alt: { type: String, trim: true, maxlength: 200 },
  width: Number,
  height: Number
}, { _id: false });

const optionSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 300 },
  image: { type: imageSchema, default: null }
});

const numericSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  tolerance: { type: Number, min: 0, default: 0 },
  toleranceKind: { type: String, enum: ["absolute", "percent"], default: "absolute" },
  unit: { type: String, trim: true, maxlength: 30, default: "" }
}, { _id: false });

const pairSchema = new mongoose.Schema({
  left: { type: String, trim: true, maxlength: 200 },
  right: { type: String, trim: true, maxlength: 200 }
}, { _id: false });

const speciesSchema = new mongoose.Schema({
  formula: { type: String, trim: true, maxlength: 40 },
  side: { type: String, enum: ["reactant", "product"] },
  coefficient: { type: Number, min: 1, max: 99 }
}, { _id: false });

const equationSchema = new mongoose.Schema({ species: { type: [speciesSchema], default: [] } }, { _id: false });

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const questionSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  type: { type: String, enum: ["mcq", "true_false", "multi_select", "numeric", "fill_blank", "matching", "ordering", "balancing"], required: true },
  text: { type: String, required: true, trim: true, maxlength: 1500 },
  image: { type: imageSchema, default: null },
  options: { type: [optionSchema], default: [] },
  correctOption: { type: mongoose.Schema.Types.ObjectId, default: null },
  correctAnswer: { type: String, enum: ["true", "false"], default: null },
  // multi_select: ids of every correct option (the options themselves are in `options`).
  correctOptions: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  // numeric: the right number, how far off is allowed, and an optional unit the student must give.
  numeric: { type: numericSchema, default: null },
  // fill_blank: every accepted answer. Case and extra spaces are ignored.
  acceptedAnswers: { type: [{ type: String, trim: true, maxlength: 200 }], default: [] },
  // matching: each left item and the right item it goes with.
  pairs: { type: [pairSchema], default: [] },
  // ordering: the items in their correct order. Students see them shuffled.
  items: { type: [{ type: String, trim: true, maxlength: 200 }], default: [] },
  // balancing: every species with its side and lowest whole-number coefficient.
  equation: { type: equationSchema, default: null },
  explanation: { type: String, default: "", trim: true, maxlength: 4000 },
  explanationImage: { type: imageSchema, default: null },
  // Optional tags for practising by topic.
  topic: { type: String, default: "", trim: true, maxlength: 60 },
  source: { type: String, default: "", trim: true, maxlength: 60 },
  year: { type: Number, min: 1900, max: 2100, default: null },
  // Shown on request before answering.
  hint: { type: String, default: "", trim: true, maxlength: 500 },
  // Numbered steps, shown only after the student answers.
  workedSolution: { type: [{ type: String, trim: true, maxlength: 1000 }], default: [] },
  order: { type: Number, required: true, min: 1 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

questionSchema.index({ test: 1, order: 1 });
questionSchema.index({ topic: 1 });

const validateImage = (image, path, invalidate) => {
  if (!image) return;
  if (image.url && !image.alt) invalidate(path, "Image alt text is required when a URL is provided");
};

questionSchema.pre("validate", function () {
  if (!this.test) this.invalidate("test", "A question must belong to a test");
  validateImage(this.image, "image", (path, message) => this.invalidate(path, message));
  validateImage(this.explanationImage, "explanationImage", (path, message) => this.invalidate(path, message));

  if (this.type === "mcq") {
    if (this.workedSolution && this.workedSolution.length > 12) this.invalidate("workedSolution", "A worked solution can have at most 12 steps");
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

  const type = this.type;
  if (type !== "mcq" && type !== "multi_select" && this.options.length) this.invalidate("options", "This question type cannot have options");
  if (type === "multi_select") {
    if (this.options.length < 2 || this.options.length > 6) this.invalidate("options", "A multi-select question needs 2 to 6 options");
    this.options.forEach((option, index) => {
      if (!option.text && !(option.image && option.image.url)) this.invalidate(`options.${index}`, "Each option needs text or an image");
    });
    const ids = this.correctOptions.map(String);
    if (!ids.length || new Set(ids).size !== ids.length || !ids.every((id) => this.options.some((option) => option._id.toString() === id))) {
      this.invalidate("correctOptions", "Choose at least one correct option");
    }
  }
  if (type === "numeric") {
    if (!this.numeric || !Number.isFinite(this.numeric.value)) this.invalidate("numeric", "A numeric question needs a correct value");
  }
  if (type === "fill_blank") {
    if (!this.acceptedAnswers.length || this.acceptedAnswers.some((answer) => !answer)) this.invalidate("acceptedAnswers", "Add at least one accepted answer");
    if (this.acceptedAnswers.length > 20) this.invalidate("acceptedAnswers", "At most 20 accepted answers");
  }
  if (type === "matching") {
    if (this.pairs.length < 2 || this.pairs.length > 8 || this.pairs.some((pair) => !pair.left || !pair.right)) {
      this.invalidate("pairs", "A matching question needs 2 to 8 pairs, each with both sides");
    }
  }
  if (type === "ordering") {
    if (this.items.length < 2 || this.items.length > 8 || this.items.some((item) => !item)) this.invalidate("items", "An ordering question needs 2 to 8 items");
  }
  if (type === "balancing") {
    const species = this.equation ? this.equation.species : [];
    if (species.length < 2 || species.length > 8 || species.some((item) => !item.formula || !item.side || !Number.isInteger(item.coefficient))) {
      this.invalidate("equation", "An equation needs 2 to 8 species, each with a formula, a side and a whole-number coefficient");
    } else if (!species.some((item) => item.side === "reactant") || !species.some((item) => item.side === "product")) {
      this.invalidate("equation", "An equation needs at least one reactant and one product");
    } else if (species.map((item) => item.coefficient).reduce(gcd) !== 1) {
      this.invalidate("equation", "Coefficients must be the lowest whole numbers");
    }
  }
});

module.exports = mongoose.model("Question", questionSchema);
