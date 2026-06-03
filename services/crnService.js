const pool = require("../config/db");

const generateCRN = async () => {
  try {
    const currentYear = new Date().getFullYear();

    // Count existing complaints in PostgreSQL
    const result = await pool.query(`
      SELECT COUNT(*) AS count
      FROM complaints
    `);

    const complaintCount = parseInt(result.rows[0].count, 10);

    const nextNumber = complaintCount + 1;

    const paddedNumber = String(nextNumber).padStart(6, "0");

    const crn = `IAU-${currentYear}-${paddedNumber}`;

    return crn;

  } catch (error) {
    console.error("CRN Generation Error:", error.message);

    throw new Error("Failed to generate CRN");
  }
};

module.exports = generateCRN;