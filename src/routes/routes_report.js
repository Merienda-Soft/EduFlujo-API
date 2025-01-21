const express = require('express');
const router = express.Router();
const report = require('../controllers/reportController');

// Rutas CRUD para Actividades
router.get('/', report.generateExcelReport);
router.get('/:id', report.getTasksFrom);
module.exports = router;
