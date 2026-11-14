const studentQuestion = (question) => ({
  _id: question._id,
  type: question.type,
  text: question.text,
  image: question.image,
  hint: question.hint || "",
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
      : undefined
  };
};

module.exports = { studentQuestion, questionForAdmin };
