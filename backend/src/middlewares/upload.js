const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(null, true);
    }
    return callback(new Error("Only JPEG, PNG and WEBP images are allowed"));
  }
});

const detectImageType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
};

const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be 2 MB or smaller" });
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Send one image in the field named image" });
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({ message: "Send only one image at a time" });
      }
      return res.status(400).json({ message: "Invalid image upload" });
    }
    if (!req.file || !detectImageType(req.file.buffer)) {
      return res.status(400).json({ message: "The uploaded file is not a valid JPEG, PNG or WEBP image" });
    }
    next();
  });
};

module.exports = { uploadImage, detectImageType };
