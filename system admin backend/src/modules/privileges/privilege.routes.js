const express = require('express');
const controller = require('./privilege.controller');

const router = express.Router();

router.get('/', controller.listPrivileges);
router.post('/', controller.createPrivilege);
router.get('/:id', controller.getPrivilegeById);
router.put('/:id', controller.updatePrivilege);
router.patch('/:id', controller.updatePrivilege);
router.delete('/:id', controller.deletePrivilege);

module.exports = router;
