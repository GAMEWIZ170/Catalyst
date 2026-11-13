const materialUrl = require("./materialUrl");

// What a student sees of a material.
module.exports = (item) => ({
  _id: item._id,
  title: item.title,
  description: item.description,
  kind: item.kind,
  url: materialUrl(item),
  format: item.file?.format,
  bytes: item.file?.bytes
});
