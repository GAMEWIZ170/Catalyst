const Joi = require("joi");
const avatarKeys = require("../config/avatars");

const objectId = Joi.string().hex().length(24);
const imageSchema = Joi.object({
  url: Joi.string().uri({ scheme: ["https"] }).custom((value, helpers) => {
    const cloudinary = require("../config/cloudinary");
    const cloudName = cloudinary.config().cloud_name;
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return helpers.error("string.uri");
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" ||
      parsed.username || parsed.password || parsed.port || !cloudName ||
      !parsed.pathname.startsWith(`/${cloudName}/`)) {
      return helpers.error("any.invalid", { message: "Image URL must be a Cloudinary URL for this account" });
    }
    return value;
  }).messages({ "any.invalid": "{{#message}}" }),
  publicId: Joi.string(),
  alt: Joi.string().trim().min(1).max(200),
  // Size in pixels, kept so the browser can reserve the space before the image arrives. Optional: older images have none.
  width: Joi.number().integer().min(1).max(20000),
  height: Joi.number().integer().min(1).max(20000)
}).with("url", ["publicId", "alt"]).custom((value, helpers) => {
  if (value.url && (!value.publicId || !value.publicId.startsWith("catalyst/"))) {
    return helpers.error("any.invalid", { message: "publicId must start with catalyst/ when a URL is provided" });
  }
  if (value.url && !decodeURIComponent(new URL(value.url).pathname).includes(`/${value.publicId}`)) {
    return helpers.error("any.invalid", { message: "publicId must appear in the image URL" });
  }
  return value;
}).messages({ "any.invalid": "{{#message}}" });
const optionalImage = imageSchema.allow(null);
const cloudinaryFile = Joi.object({
  url: Joi.string().uri({ scheme: ["https"] }).custom((value, helpers) => {
    const cloudName = require("../config/cloudinary").config().cloud_name;
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || parsed.username || parsed.password || parsed.port || !parsed.pathname.startsWith(`/${cloudName}/`)) return helpers.error("any.invalid", { message: "Invalid Cloudinary file URL" });
    return value;
  }).messages({ "any.invalid": "{{#message}}" }).required(),
  publicId: Joi.string().pattern(/^catalyst\/materials\/.+\.pdf$/).required()
    .messages({ "string.pattern.base": "publicId must start with catalyst/materials/ and end with .pdf" }),
  format: Joi.string().required(),
  bytes: Joi.number().integer().positive().required()
}).custom((value, helpers) => {
  if (!decodeURIComponent(new URL(value.url).pathname).includes(`/${value.publicId}`)) return helpers.error("any.invalid", { message: "File publicId must appear in the URL" });
  return value;
}).messages({ "any.invalid": "{{#message}}" });
const linkUrl = Joi.string().uri({ scheme: ["https"] }).custom((value, helpers) => {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.port) return helpers.error("any.invalid", { message: "Link URL cannot contain credentials or a port" });
  return value;
}).messages({
  "string.uri": "Links must start with https://",
  "string.uriCustomScheme": "Links must start with https://",
  "string.pattern.base": "Links must start with https://",
  "any.invalid": "{{#message}}"
});

const validateWith = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });
  req.body = value;
  next();
};

const validatePosition = validateWith(Joi.object({
  lessonId: objectId.required(),
  kind: Joi.string().valid("lesson", "flashcards").default("lesson"),
  position: Joi.number().integer().min(0).max(10000).default(0),
  total: Joi.number().integer().min(0).max(10000).default(0)
}));

const validatePreferences = validateWith(Joi.object({
  onboarded: Joi.boolean(),
  examDate: Joi.date().iso().allow(null),
  goalKind: Joi.string().valid("none", "minutes", "lesson"),
  goalMinutes: Joi.number().integer().min(5).max(240)
}).min(1));

const validateStudyTime = validateWith(Joi.object({ seconds: Joi.number().integer().min(1).max(120).required() }));

const validateBookmark = validateWith(Joi.object({ kind: Joi.string().valid("lesson", "question").required(), id: objectId.required() }));
const validateNote = validateWith(Joi.object({ text: Joi.string().trim().allow("").max(2000).required() }));

const validateRegister = validateWith(Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  password: Joi.string().min(8).max(72).required()
}));
const validateLogin = validateWith(Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().max(72).required()
}));
const tokenField = Joi.string().hex().length(64).required();
const validateForgotPassword = validateWith(Joi.object({ email: Joi.string().trim().lowercase().email().required() }));
const validateResetPassword = validateWith(Joi.object({ token: tokenField, password: Joi.string().min(8).max(72).required() }));
const validateVerifyEmail = validateWith(Joi.object({ token: tokenField }));
const validateChangePassword = validateWith(Joi.object({
  currentPassword: Joi.string().max(72).required(),
  newPassword: Joi.string().min(8).max(72).required()
}));
const validateChangeEmail = validateWith(Joi.object({
  password: Joi.string().max(72).required(),
  email: Joi.string().trim().lowercase().email().required()
}));
const validateDeleteAccount = validateWith(Joi.object({
  password: Joi.string().max(72).required(),
  confirm: Joi.string().valid("DELETE").required().messages({ "any.only": "Type DELETE to confirm" })
}));
const validateAvatar = validateWith(Joi.object({ avatar: Joi.alternatives().try(Joi.string().valid(...avatarKeys), Joi.valid(null)).required() }));

const courseFields = {
  code: Joi.string().trim(),
  title: Joi.string().trim(),
  description: Joi.string().trim().max(200),
  isPublished: Joi.boolean()
};
const validateCourse = validateWith(Joi.object({
  code: courseFields.code.required(),
  title: courseFields.title.required(),
  description: courseFields.description.required(),
  isPublished: courseFields.isPublished.default(false)
}));
const validateCourseUpdate = validateWith(Joi.object(courseFields).min(1));

const unitFields = { course: objectId, title: Joi.string().trim(), order: Joi.number().integer().min(1) };
const validateUnit = validateWith(Joi.object({
  course: unitFields.course.required(), title: unitFields.title.required(), order: unitFields.order.required()
}));
const validateUnitUpdate = validateWith(Joi.object(unitFields).min(1));

const lessonFields = {
  unit: objectId,
  title: Joi.string().trim(),
  order: Joi.number().integer().min(1),
  explanation: Joi.string().trim().max(10000),
  explanationImage: optionalImage,
  videoHost: Joi.string().trim().allow(""),
  videoId: Joi.string().trim().allow(""),
  isPublished: Joi.boolean()
};
const validateLesson = validateWith(Joi.object({
  unit: lessonFields.unit.required(),
  title: lessonFields.title.required(),
  order: lessonFields.order.required(),
  explanation: lessonFields.explanation.required(),
  explanationImage: lessonFields.explanationImage,
  videoHost: lessonFields.videoHost.default(""),
  videoId: lessonFields.videoId.default(""),
  isPublished: lessonFields.isPublished.default(false)
}));
const validateLessonUpdate = validateWith(Joi.object(lessonFields).min(1));

const testFields = {
  scope: Joi.string().valid("lesson", "unit", "course"),
  lesson: objectId,
  unit: objectId,
  course: objectId,
  title: Joi.string().trim().max(80),
  order: Joi.number().integer().min(1),
  isPublished: Joi.boolean(),
  passPercent: Joi.number().integer().min(0).max(100).allow(null),
  timeLimitMinutes: Joi.number().integer().min(1).max(360).allow(null)
};
const validateTest = validateWith(Joi.object({
  scope: testFields.scope.required(),
  lesson: testFields.lesson,
  unit: testFields.unit,
  course: testFields.course,
  title: testFields.title,
  order: testFields.order,
  isPublished: testFields.isPublished.default(false),
  passPercent: testFields.passPercent.default(50),
  timeLimitMinutes: testFields.timeLimitMinutes
}).custom((value, helpers) => {
  const parent = value[value.scope];
  if (!parent || Object.keys(value).filter((key) => ["lesson", "unit", "course"].includes(key) && value[key]).length !== 1) {
    return helpers.error("any.invalid", { message: "Exactly one parent matching scope is required" });
  }
  return value;
}).messages({ "any.invalid": "{{#message}}" }));
const validateTestUpdate = validateWith(Joi.object({
  title: testFields.title,
  order: testFields.order,
  isPublished: testFields.isPublished,
  passPercent: testFields.passPercent,
  timeLimitMinutes: testFields.timeLimitMinutes
}).min(1));

const optionFields = Joi.object({
  text: Joi.string().trim().max(300),
  image: optionalImage
}).or("text", "image");
const questionFields = {
  test: objectId,
  type: Joi.string().valid("mcq", "true_false", "multi_select", "numeric", "fill_blank", "matching", "ordering", "balancing"),
  text: Joi.string().trim().max(1500),
  image: optionalImage,
  options: Joi.array().items(optionFields).max(6),
  correctIndex: Joi.number().integer().min(0),
  correctIndexes: Joi.array().items(Joi.number().integer().min(0)).unique().min(1).max(6),
  correctAnswer: Joi.string().valid("true", "false"),
  numeric: Joi.object({
    value: Joi.number().required(),
    tolerance: Joi.number().min(0),
    toleranceKind: Joi.string().valid("absolute", "percent"),
    unit: Joi.string().trim().allow("").max(30)
  }),
  acceptedAnswers: Joi.array().items(Joi.string().trim().min(1).max(200)).min(1).max(20),
  pairs: Joi.array().items(Joi.object({ left: Joi.string().trim().min(1).max(200).required(), right: Joi.string().trim().min(1).max(200).required() })).min(2).max(8),
  items: Joi.array().items(Joi.string().trim().min(1).max(200)).min(2).max(8),
  equation: Joi.object({
    species: Joi.array().items(Joi.object({
      formula: Joi.string().trim().min(1).max(40).required(),
      side: Joi.string().valid("reactant", "product").required(),
      coefficient: Joi.number().integer().min(1).max(99).required()
    })).min(2).max(8).required()
  }),
  explanation: Joi.string().trim().allow("").max(4000),
  explanationImage: optionalImage,
  topic: Joi.string().trim().allow("").max(60),
  source: Joi.string().trim().allow("").max(60),
  year: Joi.number().integer().min(1900).max(2100).allow(null),
  hint: Joi.string().trim().allow("").max(500),
  workedSolution: Joi.array().items(Joi.string().trim().min(1).max(1000)).max(12),
  order: Joi.number().integer().min(1)
};
const questionSchema = Joi.object(questionFields).custom((value, helpers) => {
  if (value.type === "mcq") {
    if (!value.options || value.options.length < 2 || value.options.length > 6 || value.correctIndex == null) {
      return helpers.error("any.invalid", { message: "MCQ requires 2 to 6 options and correctIndex" });
    }
    if (value.correctIndex >= value.options.length) return helpers.error("any.invalid", { message: "correctIndex is out of range" });
    if (value.correctAnswer != null) return helpers.error("any.invalid", { message: "MCQ cannot include correctAnswer" });
  }
  if (value.type === "true_false" && ((value.options && value.options.length > 0) || value.correctIndex != null || !value.correctAnswer)) {
    return helpers.error("any.invalid", { message: "True/false requires correctAnswer and no options" });
  }
  return value;
}).messages({ "any.invalid": "{{#message}}" });
const questionCreateSchema = questionSchema.keys({
  test: questionFields.test.required(),
  type: questionFields.type.required(),
  text: questionFields.text.required(),
  order: questionFields.order.required()
});
const validateQuestion = validateWith(questionCreateSchema);
const validateQuestionUpdate = validateWith(Joi.object({
  test: questionFields.test,
  type: Joi.any().forbidden().messages({ "any.unknown": "Question type cannot be changed" }),
  text: questionFields.text,
  image: questionFields.image,
  options: questionFields.options,
  correctIndex: questionFields.correctIndex,
  correctIndexes: questionFields.correctIndexes,
  correctAnswer: questionFields.correctAnswer,
  numeric: questionFields.numeric,
  acceptedAnswers: questionFields.acceptedAnswers,
  pairs: questionFields.pairs,
  items: questionFields.items,
  equation: questionFields.equation,
  explanation: questionFields.explanation,
  explanationImage: questionFields.explanationImage,
  topic: questionFields.topic,
  source: questionFields.source,
  year: questionFields.year,
  hint: questionFields.hint,
  workedSolution: questionFields.workedSolution,
  order: questionFields.order
}).min(1).custom((value, helpers) => {
  const hasIndex = value.correctIndex !== undefined || value.correctIndexes !== undefined;
  if ((value.options !== undefined) !== hasIndex) {
    return helpers.error("any.invalid", { message: "options and correctIndex must be sent together" });
  }
  if (value.options !== undefined && value.correctIndex !== undefined &&
    value.correctIndex >= value.options.length) {
    return helpers.error("any.invalid", { message: "correctIndex is out of range" });
  }
  return value;
}).messages({ "any.invalid": "{{#message}}" }));

const validateExamSave = validateWith(Joi.object({
  answers: Joi.object().pattern(objectId, Joi.string().allow("").max(1000)).max(200),
  flags: Joi.array().items(objectId).max(200)
}));
const validateAnswer = validateWith(Joi.object({ answer: Joi.string().trim().min(1).max(1000).required() }));
const validateReport = validateWith(Joi.object({
  kind: Joi.string().valid("question", "lesson").required(),
  target: objectId.required(),
  category: Joi.string().valid("wrong_answer", "typo", "unclear", "other").required(),
  note: Joi.string().trim().allow("").max(500)
}));
const validateResolveReport = validateWith(Joi.object({ reply: Joi.string().trim().allow("").max(1000) }));
const validateTestSubmission = validateWith(Joi.object({
  answers: Joi.array().items(Joi.object({
    questionId: objectId.required(),
    answer: Joi.string().trim().allow("").max(1000).required()
  })).max(100).required()
}));
  const flashcardSide = Joi.object({
    text: Joi.string().trim().max(500),
    image: optionalImage
  }).custom((value, helpers) => {
    if (!value.text && !(value.image && value.image.url)) {
      return helpers.error("any.invalid", { message: "Each flashcard side needs text or an image" });
    }
    return value;
  }).messages({ "any.invalid": "{{#message}}" });
  const validateFlashcard = validateWith(Joi.object({
    lesson: objectId.required(),
    front: flashcardSide.required(),
    back: flashcardSide.required(),
    order: Joi.number().integer().min(1),
    isPublished: Joi.boolean().default(false)
  }));
  const validateFlashcardUpdate = validateWith(Joi.object({
    lesson: objectId,
    front: flashcardSide,
    back: flashcardSide,
    order: Joi.number().integer().min(1),
    isPublished: Joi.boolean()
  }).min(1));
  const validateRating = validateWith(Joi.object({
    confidence: Joi.string().valid("confident", "unsure", "unknown").required()
  }));
  const materialFields = {
    lesson: objectId,
    title: Joi.string().trim().max(120),
    description: Joi.string().trim().max(300).allow(""),
    kind: Joi.string().valid("file", "link"),
    file: cloudinaryFile,
    linkUrl
  };
  const validateMaterial = validateWith(Joi.object({ ...materialFields, lesson: objectId.required(), title: materialFields.title.required(), kind: materialFields.kind.required(), order: Joi.number().integer().min(1), isPublished: Joi.boolean().default(false) }).custom((value, helpers) => {
    if (value.kind === "file" && (!value.file || value.linkUrl)) return helpers.error("any.invalid", { message: "File materials require a file" });
    if (value.kind === "link" && (!value.linkUrl || value.file)) return helpers.error("any.invalid", { message: "Link materials require a link" });
    return value;
  }).messages({ "any.invalid": "{{#message}}" }));
  const validateMaterialUpdate = validateWith(Joi.object({
    lesson: materialFields.lesson,
    title: materialFields.title,
    description: materialFields.description,
    file: materialFields.file,
    linkUrl: materialFields.linkUrl,
    order: Joi.number().integer().min(1),
    isPublished: Joi.boolean(),
    kind: Joi.any().forbidden().messages({ "any.unknown": "Material kind cannot be changed" })
  }).min(1));
  const reorderIds = Joi.array().items(objectId).min(1).max(500).unique()
    .required().messages({ "array.unique": "ids must list every item exactly once" });
  const validateReorderUnits = validateWith(Joi.object({
    course: objectId.required(),
    ids: reorderIds
  }));
  const validateReorderLessons = validateWith(Joi.object({
    unit: objectId.required(),
    ids: reorderIds
  }));
  const validateReorderTests = validateWith(Joi.object({
    scope: Joi.string().valid("lesson", "unit", "course").required(),
    parent: objectId.required(),
    ids: reorderIds
  }));
  const validateReorderQuestions = validateWith(Joi.object({
    test: objectId.required(),
    ids: reorderIds
  }));
  const validateReorderFlashcards = validateWith(Joi.object({
    lesson: objectId.required(),
    ids: reorderIds
  }));
  const validateReorderMaterials = validateWith(Joi.object({
    lesson: objectId.required(),
    ids: reorderIds
  }));

const validateUserUpdate = validateWith(Joi.object({
  role: Joi.string().valid("student", "admin"),
  isActive: Joi.boolean(),
  subscriptionEndsAt: Joi.date().iso().allow(null),
  extendMonths: Joi.number().integer().min(1).max(12)
}).min(1).oxor("subscriptionEndsAt", "extendMonths"));

module.exports = {
  objectId,
  validateUserUpdate,
  imageSchema,
  optionalImage,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateChangePassword,
  validateChangeEmail,
  validateDeleteAccount,
  validateAvatar,
  validatePosition,
  validatePreferences,
  validateStudyTime,
  validateBookmark,
  validateNote,
  validateCourse,
  validateCourseUpdate,
  validateUnit,
  validateUnitUpdate,
  validateLesson,
  validateLessonUpdate,
  validateTest,
  validateTestUpdate,
  validateQuestion,
  questionCreateSchema,
  validateQuestionUpdate,
  validateAnswer,
  validateReport,
  validateResolveReport,
  validateExamSave,
  validateTestSubmission,
  validateFlashcard,
  validateFlashcardUpdate,
  validateRating
  , validateMaterial, validateMaterialUpdate,
  validateReorderUnits, validateReorderLessons, validateReorderTests,
  validateReorderQuestions, validateReorderFlashcards, validateReorderMaterials
};
