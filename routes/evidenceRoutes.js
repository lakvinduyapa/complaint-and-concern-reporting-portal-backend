const express = require("express");
const router = express.Router();
const Evidence = require("../models/Evidence");
const upload = require("../config/multer");

// Upload evidence
router.post("/add", upload.array("files", 5), async (req, res) => {
  try {

    const filePaths = req.files.map(file => file.filename);

    const evidence = new Evidence({
      ...req.body,
      files: filePaths
    });

    const saved = await evidence.save();

    res.json(saved);

  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;