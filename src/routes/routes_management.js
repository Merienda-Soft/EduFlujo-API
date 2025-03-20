const express = require('express');
const router = express.Router();
const managementController = require('../controllers/managementController');

router.get('/', managementController.getManagementNow);
router.post('/', managementController.createManagement);
router.delete('/:id', managementController.deleteManagement);

module.exports = router;