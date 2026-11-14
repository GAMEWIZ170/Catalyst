const { shuffleOrder } = require("./grading");

// What each type shows before answering. Nothing here reveals the answer:
// matching and ordering are shuffled the same way the grader rebuilds them, and balancing has no coefficients.
const typeExtras = (question) => {
  switch (question.type) {
    case "multi_select":
      return { options: question.options.map((option) => ({ _id: option._id, text: option.text, image: option.image })) };
    case "numeric":
      return { askUnit: Boolean(question.numeric && question.numeric.unit) };
    case "matching": {
      const order = shuffleOrder(question.pairs.length, question._id);
      return { left: question.pairs.map((pair) => pair.left), right: order.map((index) => question.pairs[index].right) };
    }
    case "ordering": {
      const order = shuffleOrder(question.items.length, question._id);
      return { items: order.map((index) => question.items[index]) };
    }
    case "balancing":
      return { species: question.equation.species.map((item) => ({ formula: item.formula, side: item.side })) };
    default:
      return {};
  }
};

const studentQuestion = (question) => ({
  _id: question._id,
  type: question.type,
  text: question.text,
  image: question.image,
  hint: question.hint || "",
  ...typeExtras(question),
  ...(question.type === "mcq" ? {
    options: question.options.map((option) => ({ _id: option._id, text: option.text, image: option.image }))
  } : {}),
  order: question.order
});

const questionForAdmin = (question) => {
  const data = question.toObject ? question.toObject() : question;
  return {
    ...data,
    correctIndex: data.type === "mcq"
      ? data.options.findIndex((option) => option._id.toString() === data.correctOption.toString())
      : undefined,
    correctIndexes: data.type === "multi_select"
      ? data.options.map((option, index) => (data.correctOptions || []).some((id) => id.toString() === option._id.toString()) ? index : -1).filter((index) => index >= 0)
      : undefined
  };
};

module.exports = { studentQuestion, questionForAdmin };
