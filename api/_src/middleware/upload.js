const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// In serverless environments, store in os.tmpdir() or local uploads if writable
let uploadRoot = path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
} catch (e) {
  uploadRoot = path.join(os.tmpdir(), 'uploads');
  try {
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
  } catch (err) {}
}

const categoriesDir = path.join(uploadRoot, 'categories');
const productsDir = path.join(uploadRoot, 'products');
const bannersDir = path.join(uploadRoot, 'banners');

[categoriesDir, productsDir, bannersDir].forEach(d => {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  } catch (e) {}
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = uploadRoot;
    if (file.fieldname === 'category_image') {
      dest = categoriesDir;
    } else if (file.fieldname === 'product_image') {
      dest = productsDir;
    } else if (file.fieldname === 'banner_image' || file.fieldname.startsWith('banner_image_')) {
      dest = bannersDir;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only real images are allowed (jpg, jpeg, png, webp, gif)'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

module.exports = upload;
