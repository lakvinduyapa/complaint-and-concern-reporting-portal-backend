const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const getAcknowledgementEmail = (complaint, trackingLink) => ({
  subject: `Complaint Received - CRN: ${complaint.crn}`,
  html: `
    <html><body style="font-family:Arial">
      <h1>SLTMobitel IAU - Complaint Received</h1>
      <p>Thank you for your complaint submission.</p>
      <p><strong>CRN: ${complaint.crn}</strong></p>
      <p>Category: ${complaint.category}</p>
      <p>Status: ${complaint.currentStatus}</p>
      <p><a href="${trackingLink}">Track Your Complaint</a></p>
      <p>Please keep your CRN for future reference.</p>
    </body></html>
  `
});

const getStatusUpdateEmail = (complaint, previousStatus, trackingLink) => ({
  subject: `Status Update - CRN: ${complaint.crn}`,
  html: `
    <html><body style="font-family:Arial">
      <h1>Complaint Status Updated</h1>
      <p>CRN: ${complaint.crn}</p>
      <p>Previous Status: ${previousStatus}</p>
      <p>Current Status: ${complaint.currentStatus}</p>
      <p><a href="${trackingLink}">View Full Status</a></p>
    </body></html>
  `
});

const getEscalationEmail = (complaint, trackingLink) => ({
  subject: `Escalated - CRN: ${complaint.crn}`,
  html: `
    <html><body style="font-family:Arial">
      <h1>⚠️ Complaint Escalated</h1>
      <p>CRN: ${complaint.crn}</p>
      <p>Your complaint has been escalated to CIABOC.</p>
      <p>Reason: ${complaint.escalationReason || "Senior management involved"}</p>
      <p><a href="${trackingLink}">Track Status</a></p>
    </body></html>
  `
});

const sendAcknowledgementEmail = async (complaint) => {
  try {
    if (!complaint.reporter?.email || complaint.isAnonymous) return { success: true, skipped: true };
    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/track-complaint?crn=${complaint.crn}`;
    const email = getAcknowledgementEmail(complaint, link);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: complaint.reporter.email,
      subject: email.subject,
      html: email.html
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending acknowledgement:", error);
    return { success: false, error: error.message };
  }
};

const sendStatusUpdateEmail = async (complaint, previousStatus) => {
  try {
    if (!complaint.reporter?.email || complaint.isAnonymous) return { success: true, skipped: true };
    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/track-complaint?crn=${complaint.crn}`;
    const email = getStatusUpdateEmail(complaint, previousStatus, link);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: complaint.reporter.email,
      subject: email.subject,
      html: email.html
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending status update:", error);
    return { success: false, error: error.message };
  }
};

const sendEscalationEmail = async (complaint) => {
  try {
    if (!complaint.reporter?.email || complaint.isAnonymous) return { success: true, skipped: true };
    const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/track-complaint?crn=${complaint.crn}`;
    const email = getEscalationEmail(complaint, link);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: complaint.reporter.email,
      subject: email.subject,
      html: email.html
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending escalation:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAcknowledgementEmail,
  sendStatusUpdateEmail,
  sendEscalationEmail
};
