const multer = require("multer");

const path = require("path");

const fs = require("fs");


// ========================================
// Create Upload Directories
// ========================================

const createDirectory = (dirPath) => {

  if (!fs.existsSync(dirPath)) {

    fs.mkdirSync(dirPath, { recursive: true });

  }

};


createDirectory("uploads/documents");
createDirectory("uploads/images");
createDirectory("uploads/videos");


// ========================================
// Multer Storage Configuration
// ========================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    const mimeType = file.mimetype;

    // Images
    if (mimeType.startsWith("image/")) {

      cb(null, "uploads/images");

    }

    // Videos
    else if (mimeType.startsWith("video/")) {

      cb(null, "uploads/videos");

    }

    // Documents
    else {

      cb(null, "uploads/documents");

    }

  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");

    cb(null, uniqueName);

  }

});


// ========================================
// Allowed File Types
// ========================================

const allowedMimeTypes = [

  // Documents
  "application/pdf",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Images
  "image/png",

  "image/jpeg",

  "image/jpg",

  // Videos
  "video/mp4"

];


// ========================================
// File Filter
// ========================================

const fileFilter = (req, file, cb) => {

  if (allowedMimeTypes.includes(file.mimetype)) {

    cb(null, true);

  } else {

    cb(new Error("Invalid file type"), false);

  }

};


// ========================================
// Upload Middleware
// ========================================

const upload = multer({

  storage,

  fileFilter,

  limits: {

    fileSize: 10 * 1024 * 1024 // 10MB

  }

});


module.exports = upload;