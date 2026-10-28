const Joi = require("joi");

const validateCourse = (req, res, next) => {
  const schema = Joi.object({
    code: Joi.string().trim().required(),
    title: Joi.string().trim().required(),
    description: Joi.string().max(200).trim().required(),
    isPublished: Joi.boolean().default(false)
  }); 

  const { error, value } = schema.validate(req.body, {stripUnknown: true});
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  req.body = value;
  next();
};

const validateUnit = (req, res, next) => {
    const objectId = Joi.string().hex().length(24);

    const schema = Joi.object({
        course: objectId.required(),
        title: Joi.string().trim().required(),
        order: Joi.number().integer().min(1).required()   
    }); 

    const { error, value } = schema.validate(req.body, {stripUnknown: true});
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    req.body = value;
    next();
};

const validateLesson = (req, res, next) => {
    const objectId = Joi.string().hex().length(24);

    const schema = Joi.object({
        unit: objectId.required(),
        title: Joi.string().trim().required(),
        order: Joi.number().integer().min(1).required(),
        explanation: Joi.string().max(10000).trim().required(),
        videoHost:Joi.string().allow("").default(""),
        videoId: Joi.string().allow("").default(""),
        isPublished: Joi.boolean().default(false)
    })

    const { error, value } = schema.validate(req.body, {stripUnknown: true});
    if (error) {
        return res.status(400).json({ error: error.details[0].message });        
    }
    req.body = value;
    next();
}


module.exports = {
    validateCourse,
    validateUnit,
    validateLesson
};