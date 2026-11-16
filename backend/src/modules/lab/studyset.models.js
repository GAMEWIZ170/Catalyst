const mongoose = require("mongoose");

// A student's own study set: notes, flashcards and quizzes on one topic. Private unless its owner shares it (Phase X7).
const studySetSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", trim: true, maxlength: 300 },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null }, // optional link to an official course
  topic: { type: String, default: "", trim: true, maxlength: 80 },
  visibility: { type: String, enum: ["private", "link", "community"], default: "private" },
  // Community sharing (Phase X7). "link" works for anyone with the link. "community" is the public shelf and needs approval:
  // communityStatus goes none, pending (submitted), then approved or rejected. An admin takedown makes it removed.
  // Source material (PDFs and pasted text) is never shared, whatever the visibility.
  communityStatus: { type: String, enum: ["none", "pending", "approved", "rejected", "removed"], default: "none" },
  declaredAt: { type: Date, default: null },     // when the owner declared the set is their own work
  submittedAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: "", maxlength: 300 },
  removedReason: { type: String, default: "", maxlength: 300 },
  studiedCount: { type: Number, default: 0 },    // different students who studied it (one per student per day)
  savedCount: { type: Number, default: 0 },
  copyCount: { type: Number, default: 0 },
  copiedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", default: null },
  lastStudiedAt: { type: Date, default: null },  // when the owner last opened the flashcard study
  // "Drop in your notes" flow (UI polish step 2). The AI builds drafts in the background from the first material.
  // none = nothing to review, processing = the AI is working, ready = drafts wait for the student, issue = the AI could not help.
  // The drafts live here only until the student saves or discards them.
  build: {
    status: { type: String, enum: ["none", "processing", "ready", "issue"], default: "none" },
    message: { type: String, default: "", maxlength: 300 },
    startedAt: { type: Date, default: null },
    drafts: { type: mongoose.Schema.Types.Mixed, default: null },
    // One-shot build (study companion). source: { kind: "pdf" | "text" | "topic", topic }. progress lists every lesson
    // the outline planned: { lessons: [{ id, title, status: "pending" | "done" | "failed" }], finishedAt }.
    // touchedAt moves each time a lesson finishes, so a build that stopped moving can be told from a slow one.
    source: { type: mongoose.Schema.Types.Mixed, default: null },
    progress: { type: mongoose.Schema.Types.Mixed, default: null },
    touchedAt: { type: Date, default: null }
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

studySetSchema.index({ owner: 1, deletedAt: 1, updatedAt: -1 });
studySetSchema.index({ communityStatus: 1, visibility: 1, deletedAt: 1, reviewedAt: -1 });
studySetSchema.index({ course: 1, communityStatus: 1 });

module.exports = mongoose.model("StudySet", studySetSchema);
