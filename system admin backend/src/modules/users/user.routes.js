const express = require('express');
const controller = require('./user.controller');

const router = express.Router();

router.get('/deleted', controller.listDeletedUsers);
router.get('/deleted/count', controller.countDeletedUsers);
router.get('/deleted/:id', controller.getDeletedUserById);

router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.get('/:id', controller.getUserById);
router.put('/:id', controller.updateUser);
router.patch('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
