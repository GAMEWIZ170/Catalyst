const mongoose = require("mongoose");

const testSchema = new mongoose.Schema({
  scope: { type: String, enum: ["lesson", "unit", "course"], required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", default: null },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  title: { type: String, trim: true, maxlength: 80 },
  order: { type: Number, min: 1 },
  isPublished: { type: Boolean, default: false },
  // Score (0 to 100) a student needs for a lesson test to complete the lesson. null means no requirement.
  passPercent: { type: Number, min: 0, max: 100, default: null },
  // Set it to make this a timed mock exam (minutes). null is an ordinary test.
  timeLimitMinutes: { type: Number, min: 1, max: 360, default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

testSchema.index({ lesson: 1 });
testSchema.index({ unit: 1 });
testSchema.index({ course: 1 });

testSchema.pre("validate", async function () {
  const parents = [this.lesson, this.unit, this.course].filter(Boolean);
  if (parents.length !== 1 || !this[this.scope]) {
    this.invalidate("scope", "A test must have exactly one parent matching its scope");
    return;
  }

  if (this.isNew && this.order == null) {
    const query = { scope: this.scope, deletedAt: null, [this.scope]: this[this.scope] };
    const last = await this.constructor.findOne(query).sort({ order: -1 }).select("order").lean();
    this.order = (last && last.order ? last.order : 0) + 1;
  }

  if (this.title == null || this.title === "") {
    this.title = this.scope === "lesson" ? `Test ${this.order}` :
      this.scope === "unit" ? "Unit test" : "Course test";
  }
});

module.exports = mongoose.model("Test", testSchema);
