const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const {
  validateSet, validateSetUpdate, validateSetNote, validateSetCard, validateSetCardUpdate, validateSetCards, validateSetQuiz, validateSetText,
  validateQuestion, validateQuestionUpdate, validateGenerate
} = require("../middlewares/validate");
const sets = require("../controllers/studyset.controller");
const materials = require("../controllers/setmaterial.controller");
const { uploadMaterial } = require("../middlewares/materialUpload");
const uploadLimiter = require("../middlewares/uploadLimiter");
const aiLimiter = require("../middlewares/aiLimiter");
const { generate } = require("../controllers/aigenerate.controller");
const { createQuestion, updateQuestion, deleteQuestion } = require("../controllers/question.controller");

// Every route needs a login. Every set, card, note and quiz is checked against its owner, so nobody sees another student's work.
router.use(authenticate);

router.get("/", sets.listSets);
router.post("/", validateSet, sets.createSet);

// Declared before /:id so "cards", "quizzes" and "questions" are not read as ids.
router.put("/cards/:cardId", validateSetCardUpdate, sets.updateCard);
router.delete("/cards/:cardId", sets.deleteCard);
router.delete("/materials/:materialId", materials.removeMaterial);
router.get("/quizzes/:testId", sets.getQuiz);
router.put("/quizzes/:testId", validateSetQuiz, sets.updateQuiz);
router.delete("/quizzes/:testId", sets.deleteQuiz);
router.post("/questions", validateQuestion, sets.ownQuizInBody, createQuestion);
router.put("/questions/:id", validateQuestionUpdate, sets.ownQuestion, updateQuestion);
router.delete("/questions/:id", sets.ownQuestion, deleteQuestion);

router.get("/:id", sets.getSet);
router.put("/:id", validateSetUpdate, sets.updateSet);
router.delete("/:id", sets.deleteSet);
router.get("/:id/notes", sets.getNotes);
router.put("/:id/notes", validateSetNote, sets.saveNotes);
router.get("/:id/cards", sets.listCards);
router.post("/:id/cards", validateSetCard, sets.createCard);
router.post("/:id/cards/bulk", validateSetCards, sets.createCards);
router.get("/:id/materials", materials.listMaterials);
router.post("/:id/materials/text", validateSetText, materials.addText);
router.post("/:id/materials/pdf", uploadLimiter, uploadMaterial, materials.addPdf);
router.post("/:id/generate", aiLimiter, validateGenerate, generate);
router.get("/:id/study", sets.studyCards);
router.get("/:id/quizzes", sets.listQuizzes);
router.post("/:id/quizzes", validateSetQuiz, sets.createQuiz);

module.exports = router;
