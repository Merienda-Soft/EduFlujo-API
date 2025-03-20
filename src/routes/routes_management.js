const express = require('express');
const router = express.Router();
const managementController = require('../controllers/managementController');

router.get('/', managementController.getManagementNow);
router.get('/all', managementController.getManagements);
router.post('/', managementController.createManagement);
router.delete('/:id', managementController.deleteManagement);

module.exports = router;