const express = require('express');
const controller = require('./qrCode.controller');

const router = express.Router();

router.get('/analytics', controller.getAnalytics);
router.get('/scan/:code', controller.trackScanAndRedirect);

router.get('/', controller.listQrCodes);
router.post('/', controller.createQrCode);
router.get('/:id', controller.getQrCode);
router.put('/:id', controller.updateQrCode);
router.patch('/:id', controller.updateQrCode);
router.delete('/:id', controller.deleteQrCode);
router.post('/:id/regenerate', controller.regenerateQrCode);

module.exports = router;
