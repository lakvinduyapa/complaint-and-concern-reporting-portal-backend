const Complaint = require("../../models/Complaint");

const Evidence = require("../../models/Evidence");


// ========================================
// Upload Evidence
// ========================================

const uploadEvidence = async (req, res) => {

  try {

    // Get Complaint ID
    const { complaintId, evidenceType, notes } = req.body;

    // Validate Complaint
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {

      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });

    }

    // Validate File
    if (!req.file) {

      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });

    }

    // Create Evidence Record
    const evidence = await Evidence.create({

      complaintId,

      evidenceType,

      originalFileName: req.file.originalname,

      storedFileName: req.file.filename,

      filePath: req.file.path,

      mimeType: req.file.mimetype,

      fileSize: req.file.size,

      uploadedBy: "Public User",

      notes

    });

    // Update Complaint Evidence Count
    complaint.evidenceCount += 1;

    await complaint.save();

    // Success Response
    res.status(201).json({

      success: true,

      message: "Evidence uploaded successfully",

      data: {

        evidenceId: evidence._id,

        fileName: evidence.originalFileName,

        evidenceType: evidence.evidenceType,

        uploadedAt: evidence.createdAt

      }

    });

  } catch (error) {

    console.error("Evidence Upload Error:", error.message);

    res.status(500).json({

      success: false,
      message: "Failed to upload evidence"

    });

  }

};


module.exports = {
  uploadEvidence
};