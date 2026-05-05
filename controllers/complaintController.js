const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Subject = require("../models/Subject");
const Evidence = require("../models/Evidence");
const Counter = require("../models/Counter");

// 🔥 SAFE CRN GENERATOR (NO session)
const generateCRN = async () => {
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: "complaintCRN" },
    { $inc: { value: 1 } },           // atomic increment
    { new: true, upsert: true }
  );

  const number = String(counter.value).padStart(6, "0");
  return `IAU-${year}-${number}`;
};

exports.createFullComplaint = async (req, res) => {
  try {
    // 🔹 Parse incoming JSON
    const userData = JSON.parse(req.body.userData || "{}");
    const complaintData = JSON.parse(req.body.complaintData || "{}");
    const subjectData = JSON.parse(req.body.subjectData || "{}");
    const evidenceData = JSON.parse(req.body.evidenceData || "{}");

    // 🔹 Files
    const filePaths = req.files ? req.files.map(f => f.filename) : [];

    // 🔹 Save related docs
    const savedUser = await User.create(userData);
    const savedSubject = await Subject.create(subjectData);

    const savedEvidence = await Evidence.create({
      ...evidenceData,
      files: filePaths,
    });

    // 🔥 Generate unique CRN (outside any transaction)
    const crn = await generateCRN();
    console.log("CRN GENERATED:", crn);

    // 🔹 Save complaint
    const savedComplaint = await Complaint.create({
      ...complaintData,
      crn,
      userId: savedUser._id,
      subjectId: savedSubject._id,
      evidenceId: savedEvidence._id,
    });

    res.json({
      message: "Complaint submitted successfully",
      crn,
      complaint: savedComplaint,
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};