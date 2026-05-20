const Complaint = require("../../models/Complaint");


// Get All Complaints (Paginated + Filters)

const getComplaints = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();

    const query = {};

    if (status) {
      query.currentStatus = status;
    }

    if (search) {
      query.$or = [
        { crn: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const [items, totalItems] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("crn category currentStatus createdAt isAnonymous reporter.fullName"),
      Complaint.countDocuments(query)
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Get Complaints Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints"
    });
  }
};


// Get Complaint Details


const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error("Get Complaint By Id Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint details"
    });
  }
};

module.exports = {
  getComplaints,
  getComplaintById
};