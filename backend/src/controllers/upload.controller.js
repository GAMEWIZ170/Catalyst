const cloudinary = require("../config/cloudinary");

const uploadImage = (req, res, next) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: "catalyst/images", resource_type: "image" },
    (error, result) => {
      if (error) return next(error);
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
