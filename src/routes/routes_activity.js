const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/activityController');

// Rutas CRUD para Actividades
router.get('/filter', actividadController.getFilteredActivities);
router.get('/:id', actividadController.getActividadById);
router.get('/', actividadController.getActividades);
router.post('/', actividadController.createActividad);
router.put('/:id', actividadController.updateActividad);
router.delete('/:id', actividadController.deleteActividad);

module.exports = router;
