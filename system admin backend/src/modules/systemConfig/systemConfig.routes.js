const express = require('express');
const controller = require('./systemConfig.controller');

const router = express.Router();

router.get('/groups', controller.listGroups);
router.post('/groups', controller.createGroup);
router.put('/groups/:id', controller.updateGroup);
router.patch('/groups/:id', controller.updateGroup);
router.delete('/groups/:id', controller.deleteGroup);

router.get('/groups/:groupCode/options', controller.getOptionsByGroupCode);

router.get('/email-templates', controller.listEmailTemplates);
router.post('/email-templates', controller.createEmailTemplate);
router.put('/email-templates/:id', controller.updateEmailTemplate);
router.patch('/email-templates/:id', controller.updateEmailTemplate);
router.delete('/email-templates/:id', controller.deleteEmailTemplate);


router.get('/options', controller.listOptions);
router.post('/options', controller.createOption);
router.put('/options/:id', controller.updateOption);
router.patch('/options/:id', controller.updateOption);
router.delete('/options/:id', controller.deleteOption);


module.exports = router;
