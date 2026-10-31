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

const hasSignature = (buffer, mimetype) => {
  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
};

const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be 2 MB or smaller" });
      }
      return res.status(400).json({ message: error.message || "Invalid image upload" });
    }
    if (!req.file || !hasSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ message: "The uploaded file is not a valid JPEG, PNG or WEBP image" });
    }
    next();
  });
};

module.exports = { uploadImage, hasSignature };
