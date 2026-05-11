const AuditLog = require('../../models/AuditLog');

// Get audit logs with filtering and pagination
const getAuditLogs = async (req, res) => {
  try {
    const {
      complaintId,
      action,
      userId,
      fromDate,
      toDate,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {};

    if (complaintId) {
      filter.complaintId = complaintId;
    }

    if (action) {
      filter.action = action;
    }

    if (userId) {
      filter.userId = userId;
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Add 1 day to toDate to include the entire day
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        filter.createdAt.$lt = endDate;
      }
    }

    // Get total count
    const total = await AuditLog.countDocuments(filter);

    // Get paginated results
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};

// Get unique actions for filter dropdown
const getActions = async (req, res) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json(actions.sort());
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ message: 'Failed to fetch actions' });
  }
};

// Get unique users for filter dropdown
const getUsers = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .select('userId')
      .distinct('userId')
      .lean();

    // Fetch user names from User model
    const User = require('../../models/User');
    const users = await User.find({ _id: { $in: logs } })
      .select('_id fullName email')
      .lean();

    res.json(users.map(u => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Get unique complaints for filter dropdown
const getComplaintIds = async (req, res) => {
  try {
    const Complaint = require('../../models/Complaint');
    const complaints = await Complaint.find()
      .select('_id crn category')
      .lean();

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaint IDs:', error);
    res.status(500).json({ message: 'Failed to fetch complaint IDs' });
  }
};

module.exports = {
  getAuditLogs,
  getActions,
  getUsers,
  getComplaintIds
};
