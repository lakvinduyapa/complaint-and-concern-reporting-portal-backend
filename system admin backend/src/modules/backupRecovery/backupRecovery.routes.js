const express = require('express');
const controller = require('./backupRecovery.controller');

const router = express.Router();

router.get('/summary', controller.getSummary);

router.get('/records', controller.listBackupRecords);
router.post('/records', controller.createBackupRecord);
router.get('/records/:id', controller.getBackupRecord);
router.put('/records/:id', controller.updateBackupRecord);
router.patch('/records/:id', controller.updateBackupRecord);
router.delete('/records/:id', controller.archiveBackupRecord);
router.post('/records/:id/verify', controller.verifyBackupRecord);
router.post('/records/:id/archive', controller.archiveBackupRecord);

router.get('/settings', controller.getBackupSettings);
router.put('/settings', controller.updateBackupSettings);

router.get('/dr-settings', controller.getDrSettings);
router.put('/dr-settings', controller.updateDrSettings);

router.get('/archive-settings', controller.getArchiveSettings);
router.put('/archive-settings', controller.updateArchiveSettings);

module.exports = router;
