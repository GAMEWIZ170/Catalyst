// src/middleware/validate.js
const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

// The part that used to be copied into every validator, written once.
// You give it a schema; it hands back a middleware that validates req.body.
const validateWith = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  req.body = value;
  next();
};

// ---------- Users ----------
const validateRegister = validateWith(
  Joi.object({
    name: Joi.string().trim().min(2).max(60).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    password: Joi.string().min(8).max(72).required()
  })
);

const validateLogin = validateWith(
  Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().max(72).required()
  })
);

// ---------- Courses ----------
const courseFields = {
  code: Joi.string().trim(),
  title: Joi.string().trim(),
  description: Joi.string().trim().max(200),
  isPublished: Joi.boolean()
};

const validateCourse = validateWith(
  Joi.object({
    code: courseFields.code.required(),
    title: courseFields.title.required(),
    description: courseFields.description.required(),
    isPublished: courseFields.isPublished.default(false)
  })
);
const validateCourseUpdate = validateWith(Joi.object(courseFields).min(1)); // NEW

// ---------- Units ----------
const unitFields = {
  course: objectId,
  title: Joi.string().trim(),
  order: Joi.number().integer().min(1)
};

const validateUnit = validateWith(
  Joi.object({
    course: unitFields.course.required(),
    title: unitFields.title.required(),
    order: unitFields.order.required()
  })
);
const validateUnitUpdate = validateWith(Joi.object(unitFields).min(1)); // NEW

// ---------- Lessons ----------
const lessonFields = {
  unit: objectId,
  title: Joi.string().trim(),
  order: Joi.number().integer().min(1),
  explanation: Joi.string().trim().max(10000),
  videoHost: Joi.string().trim().allow(""),
  videoId: Joi.string().trim().allow(""),
  isPublished: Joi.boolean()
};

const validateLesson = validateWith(
  Joi.object({
    unit: lessonFields.unit.required(),
    title: lessonFields.title.required(),
    order: lessonFields.order.required(),
    explanation: lessonFields.explanation.required(),
    videoHost: lessonFields.videoHost.default(""),
    videoId: lessonFields.videoId.default(""),
    isPublished: lessonFields.isPublished.default(false)
  })
);
const validateLessonUpdate = validateWith(Joi.object(lessonFields).min(1)); // NEW

// ---------- Questions (NEW) ----------
const questionFields = {
  lesson: objectId,
  type: Joi.string().valid("mcq", "true_false", "flashcard"),
  text: Joi.string().trim().max(1000),
  options: Joi.array().items(Joi.string().trim().min(1).max(300)).max(6),
  correctAnswer: Joi.string().trim().max(1000),
  explanation: Joi.string().trim().allow("").max(2000),
  order: Joi.number().integer().min(1)
};

const validateQuestion = validateWith(
  Joi.object({
    lesson: questionFields.lesson.required(),
    type: questionFields.type.required(),
    text: questionFields.text.required(),
    options: questionFields.options,
    correctAnswer: questionFields.correctAnswer.required(),
    explanation: questionFields.explanation,
    order: questionFields.order.required()
  })
);
const validateQuestionUpdate = validateWith(Joi.object(questionFields).min(1));

// A flashcard has nothing to type, so "answer" is optional here and the
// controller insists on it for the other question types
const validateAnswer = validateWith(
  Joi.object({ answer: Joi.string().trim().max(1000) })
);

// ---------- Completing a lesson ----------
const validateCompletion = validateWith(
  Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: objectId.required(),
          answer: Joi.string().trim().allow("").max(1000).required()
        })
      )
      .max(100)
      .required()
  })
);

module.exports = {
  validateRegister,
  validateLogin,
  validateCourse,
  validateCourseUpdate,
  validateUnit,
  validateUnitUpdate,
  validateLesson,
  validateLessonUpdate,
  validateQuestion,
  validateQuestionUpdate,
  validateAnswer,
  validateCompletion
};