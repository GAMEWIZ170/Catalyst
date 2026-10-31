const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
  title: { type: String, trim: true, required: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 300 },
  kind: { type: String, enum: ["file", "link"], required: true },
  file: {
    url: String,
    publicId: String,
    format: String,
    bytes: Number
  },
  linkUrl: String,
  order: { type: Number, required: true, min: 1 },
  isPublished: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

materialSchema.index({ lesson: 1, order: 1 });
materialSchema.pre("validate", function () {
  if (this.kind === "file" && (!this.file || !this.file.url || this.linkUrl)) {
    this.invalidate("file", "File materials require a file and cannot have a link");
  }
  if (this.kind === "link" && (!this.linkUrl || this.file)) {
    this.invalidate("linkUrl", "Link materials require a link and cannot have a file");
  }
});

module.exports = mongoose.model("Material", materialSchema);
