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

const NEWS_IMAGE_TYPES = /^image\/(jpeg|png|webp)$/;
const NEWS_VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;
const NEWS_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const NEWS_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const NEWS_DIR = path.join(__dirname, '..', 'uploads', 'news');

function createNewsUploader() {
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, NEWS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov'];
      let safeExt = allowed.includes(ext) ? ext : null;
      if (!safeExt) {
        if (NEWS_VIDEO_TYPES.test(file.mimetype)) safeExt = file.mimetype === 'video/webm' ? '.webm' : '.mp4';
        else safeExt = '.jpg';
      }
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: NEWS_MAX_VIDEO_BYTES, files: 10 },
    fileFilter: (req, file, cb) => {
      if (NEWS_IMAGE_TYPES.test(file.mimetype) || NEWS_VIDEO_TYPES.test(file.mimetype)) cb(null, true);
      else {
        const err = new Error('Only JPEG, PNG, or WebP images and MP4, WebM, or MOV videos are allowed.');
        err.isUploadError = true;
        cb(err);
      }
    },
  });
}

const uploadNewsMedia = createNewsUploader();

module.exports = upload;
module.exports.uploadNewsMedia = uploadNewsMedia;
module.exports.NEWS_DIR = NEWS_DIR;
module.exports.NEWS_MAX_IMAGE_BYTES = NEWS_MAX_IMAGE_BYTES;
module.exports.NEWS_MAX_VIDEO_BYTES = NEWS_MAX_VIDEO_BYTES;
module.exports.NEWS_VIDEO_TYPES = NEWS_VIDEO_TYPES;

module.exports.uploadSiteImage = uploadSiteImage;
