const Complaint = require("../../queries/complaintQueries");
const generateCRN = require("../../services/crnService");

// ========================================
// CREATE COMPLAINT (PERN VERSION)
// ========================================
const createComplaint = async (req, res) => {
  try {
    const crn = await generateCRN();

    const {
      category,
      incidentDate,
      incidentEndDate,
      incidentLocation,
      frequency,
      awarenessMethod,
      description,
      previouslyReported,
      previousReportedTo,
      previousReportOutcome,
      previousReportDetails,
      reporter,
      subjects,
    } = req.body;

    const hasSeniorManagementInvolved =
      Array.isArray(subjects) &&
      subjects.some(
        (subject) =>
          subject.seniorManagementInvolved === true ||
          subject.seniorManagementInvolved === "true" ||
          subject.seniorManagementInvolved === "Yes" ||
          subject.seniorManagementInvolved === "yes"
      );

    const initialStatus = hasSeniorManagementInvolved
      ? "Escalated to CIABOC"
      : "Submitted";

    const escalationReason = hasSeniorManagementInvolved
      ? "Complaint involves senior management or IAU member"
      : null;

    // 1. INSERT INTO complaints TABLE
    const complaint = await Complaint.createComplaint({
      crn,
      category,
      reporterFullName: reporter?.fullName || null,
      incidentDate: incidentDate || null,
      incidentEndDate: incidentEndDate || null,
      incidentLocation: incidentLocation || null,
      frequency: frequency || null,
      awarenessMethod: awarenessMethod || null,
      description,
      previouslyReported: Boolean(previouslyReported),
      previousReportedTo: previousReportedTo || null,
      previousReportOutcome:
        previousReportOutcome || previousReportDetails || null,

      currentStatus: initialStatus,
      escalationRequired: hasSeniorManagementInvolved,
      ciabocEscalation: hasSeniorManagementInvolved,
      escalationReason,
      escalationDate: hasSeniorManagementInvolved ? new Date() : null,
      escalationApprovedBy: null,

      evidenceCount: 0,
      hasEvidence: false,
      isAnonymous: reporter?.submissionType === "anonymous",
      submissionSource: "web",
      assignedTo: null,
      investigationStartDate: null,
      expectedCompletionDate: null,
    });

    const complaintId = complaint.id;

    // 2. INSERT REPORTER TABLE
    if (reporter) {
      await Complaint.createReporter({
        complaint_id: complaintId,
        submission_type: reporter.submissionType || "named",
        reporter_category: reporter.reporterCategory || null,
        full_name: reporter.fullName || null,
        employee_id: reporter.employeeId || null,
        department: reporter.department || null,
        designation: reporter.designation || null,
        email: reporter.email || null,
        phone: reporter.phone || null,
        preferred_contact_method: reporter.preferredContactMethod || null,
      });
    }

    // 3. INSERT SUBJECTS TABLE
    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const subject of subjects) {
        await Complaint.createSubject({
          complaint_id: complaintId,
          full_name: subject.fullName || null,
          designation: subject.designation || null,
          organisation: subject.organisation || null,
          relationship: subject.relationship || null,
          senior_management_involved:
            subject.seniorManagementInvolved === true ||
            subject.seniorManagementInvolved === "true" ||
            subject.seniorManagementInvolved === "Yes" ||
            subject.seniorManagementInvolved === "yes",
          senior_management_person_name:
            subject.seniorManagementPersonName || null,
        });
      }
    }

    // 4. INSERT STATUS HISTORY TABLE
    await Complaint.addStatusHistory({
      complaint_id: complaintId,
      status: initialStatus,
      note: hasSeniorManagementInvolved
        ? "Complaint automatically escalated to CIABOC because it involves senior management or IAU member"
        : "Complaint submitted successfully",
      updated_by: null,
    });

    return res.status(201).json({
      success: true,
      message: hasSeniorManagementInvolved
        ? "Complaint submitted and automatically escalated to CIABOC"
        : "Complaint submitted successfully",
      data: {
        complaintId,
        crn,
        status: initialStatus,
        ciabocEscalation: hasSeniorManagementInvolved,
        submittedAt: complaint.created_at,
      },
    });
  } catch (error) {
    console.error("Create Complaint Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to submit complaint",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  createComplaint,
};