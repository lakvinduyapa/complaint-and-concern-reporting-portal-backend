const express = require('express');
const userRoutes = require('../modules/users/user.routes');
const privilegeRoutes = require('../modules/privileges/privilege.routes');
const roleRoutes = require('../modules/roles/role.routes');
const systemConfigRoutes = require('../modules/systemConfig/systemConfig.routes');
const qrCodeRoutes = require('../modules/qrCodes/qrCode.routes');
const backupRecoveryRoutes = require('../modules/backupRecovery/backupRecovery.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API healthy' });
});

router.use('/users', userRoutes);
router.use('/privileges', privilegeRoutes);
router.use('/roles', roleRoutes);
router.use('/system-config', systemConfigRoutes);
router.use('/qr-codes', qrCodeRoutes);
router.use('/backup-recovery', backupRecoveryRoutes);

module.exports = router;
