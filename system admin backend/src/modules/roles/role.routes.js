const express = require('express');
const controller = require('./role.controller');

const router = express.Router();

router.get('/', controller.listRoles);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.patch('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);
router.get('/:id/privileges', controller.getRolePrivileges);
router.put('/:id/privileges', controller.updateRolePrivileges);
router.patch('/:id/privileges', controller.updateRolePrivileges);

module.exports = router;
