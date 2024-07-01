const multer = require("multer");
const path = require("path");

// Dosyaların yükleneceği dizin ve dosya isimleri için ayarlar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

module.exports = upload;