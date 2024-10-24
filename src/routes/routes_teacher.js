const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/teacherController');

// Rutas CRUD para Profesores
router.get('/', profesorController.getProfesores);
router.get('/:id', profesorController.getProfesorById);
router.get('/email/:email', profesorController.getProfesorByEmail);
router.post('/', profesorController.createProfesor);
router.put('/:id', profesorController.updateProfesor);
router.delete('/:id', profesorController.deleteProfesor);

module.exports = router;
