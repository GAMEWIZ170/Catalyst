const cloudinary = require("../config/cloudinary");

const uploadImage = (req, res, next) => {
  let settled = false;
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    stream.destroy();
    const uploadError = new Error("Image upload timed out");
    uploadError.status = 502;
    next(uploadError);
  }, 31000);
  const stream = cloudinary.uploader.upload_stream(
    { folder: "catalyst/images", resource_type: "image", timeout: 30000 },
    (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        const uploadError = new Error("Image upload failed");
        uploadError.status = 502;
        return next(uploadError);
      }
      if (!result || !result.secure_url || !result.public_id) {
        const uploadError = new Error("Image upload failed");
        uploadError.status = 502;
        return next(uploadError);
      }
      return res.status(201).json({
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height
        }
      });
    }
  );
  stream.end(req.file.buffer);
};

module.exports = { uploadImage };
