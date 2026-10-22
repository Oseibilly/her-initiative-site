const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploader(dirName) {
  const uploadDir = path.join(__dirname, '..', 'images', dirName);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
    },
  });
}

const upload = createUploader('executives');
const uploadSiteImage = createUploader('site');

module.exports = upload;
module.exports.uploadSiteImage = uploadSiteImage;
