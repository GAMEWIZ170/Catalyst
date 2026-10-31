const multer = require("multer");

const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => callback(null, file.mimetype === "application/pdf")
});

const uploadMaterial = (req, res, next) => materialUpload.single("file")(req, res, (error) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Material must be 10 MB or smaller" });
  }
  if (error || !req.file) return res.status(400).json({ message: "Send one PDF file in the field named file" });
  if (req.file.buffer.length < 5 || req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    return res.status(400).json({ message: "The uploaded file is not a valid PDF" });
  }
  next();
});

module.exports = { uploadMaterial };
