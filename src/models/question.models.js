// question.models.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    type: { type: String, enum: ["mcq", "true_false", "flashcard"], required: true },
    text: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true, trim: true },
    explanation: { type: String, default: "", trim: true },
    order: { type: Number, required: true },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Rules that depend on more than one field. The simple field-by-field
// rules above can't express "the correct answer must be one of the options".
questionSchema.pre("validate", function () {
    if (this.type === "mcq") {
        if (this.options.length < 2) {
            this.invalidate("options", "A multiple choice question needs at least 2 options");
        } else if (!this.options.includes(this.correctAnswer)) {
            this.invalidate("correctAnswer", "The correct answer must be one of the options");
        }
    }
    if (this.type === "true_false") {
        if (!["true", "false"].includes(this.correctAnswer.toLowerCase())) {
            this.invalidate("correctAnswer", "A true/false answer must be true or false");
        }
    }
});

module.exports = mongoose.model("Question", questionSchema);