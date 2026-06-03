const Complaint = require("../../queries/complaintQueries");
const Evidence = require("../../queries/evidenceQueries");

// ========================================
// UPLOAD MULTIPLE EVIDENCE FILES
// ========================================
const uploadEvidence = async (req, res) => {
  try {
    const { complaintId, evidenceType, notes } = req.body;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    // 1. Check complaint exists
    const complaint = await Complaint.getById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // 2. Validate uploaded files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // 3. Save each evidence file into evidence table
    const uploadedEvidence = [];

    for (const file of req.files) {
      const evidence = await Evidence.createEvidence({
        complaintId,
        evidenceType: evidenceType || "Document",
        originalFileName: file.originalname,
        storedFileName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: "Public User",
        isConfidential: true,
        verificationStatus: "Pending",
        notes: notes || null,
      });

      uploadedEvidence.push(evidence);
    }

    // 4. Update complaint evidence count
    await Complaint.updateStatus(complaintId, {
      evidence_count:
        Number(complaint.evidence_count || 0) + uploadedEvidence.length,
      has_evidence: true,
    });

    return res.status(201).json({
      success: true,
      message: "Evidence files uploaded successfully",
      count: uploadedEvidence.length,
      data: uploadedEvidence.map((evidence) => ({
        evidenceId: evidence.id,
        complaintId: evidence.complaint_id,
        fileName: evidence.original_file_name,
        storedFileName: evidence.stored_file_name,
        filePath: evidence.file_path,
        mimeType: evidence.mime_type,
        fileSize: evidence.file_size,
        evidenceType: evidence.evidence_type,
        verificationStatus: evidence.verification_status,
        uploadedAt: evidence.created_at,
      })),
    });
  } catch (error) {
    console.error("Evidence Upload Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to upload evidence",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ========================================
// GET EVIDENCE BY COMPLAINT ID
// ========================================
const getEvidenceByComplaintId = async (req, res) => {
  try {
    const { complaintId } = req.params;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const evidence = await Evidence.getEvidenceByComplaintId(complaintId);

    return res.status(200).json({
      success: true,
      count: evidence.length,
      data: evidence,
    });
  } catch (error) {
    console.error("Get Evidence Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch evidence",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  uploadEvidence,
  getEvidenceByComplaintId,
};