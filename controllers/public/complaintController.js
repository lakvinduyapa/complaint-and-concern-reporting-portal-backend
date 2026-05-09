const Complaint = require("../../models/Complaint");

const generateCRN = require("../../services/crnService");




// Create New Complaint


const createComplaint = async (req, res) => {

  try {

    // Generate CRN
    const crn = await generateCRN();

    // Extract Request Data
    const {
      category,
      incidentDate,
      incidentLocation,
      frequency,
      awarenessMethod,
      description,
      previouslyReported,
      previousReportDetails,
      reporter,
      subjects
    } = req.body;


    // Create Complaint
    const complaint = await Complaint.create({

      crn,

      category,

      incidentDate,

      incidentLocation,

      frequency,

      awarenessMethod,

      description,

      previouslyReported,

      previousReportDetails,

      reporter,

      subjects,

      isAnonymous:
        reporter?.submissionType === "anonymous",

      // Initial Status
      currentStatus: "Submitted",

      // Status Timeline
      statusHistory: [
        {
          status: "Submitted",
          note: "Complaint submitted successfully",
          updatedBy: "System"
        }
      ]

    });


    // Success Response
    res.status(201).json({

      success: true,

      message: "Complaint submitted successfully",

      data: {
        complaintId: complaint._id,
        crn: complaint.crn,
        status: complaint.currentStatus,
        submittedAt: complaint.createdAt
      }

    });

  } catch (error) {

    console.error("Create Complaint Error:", error.message);

    if (error.name === "ValidationError") {
      const details = Object.values(error.errors).map((err) => err.message);

      return res.status(400).json({
        success: false,
        message: details[0] || "Validation failed",
        details
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate complaint reference generated. Please retry submission."
      });
    }

    res.status(500).json({

      success: false,

      message: "Failed to submit complaint"

    });

  }

};


module.exports = {
  createComplaint
};