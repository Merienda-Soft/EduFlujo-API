const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

// Rutas CRUD para Materias
router.get('/', subjectController.getMaterias);
router.get('/:id', subjectController.getMateriaById);
router.post('/', subjectController.createMateria);
router.put('/:id', subjectController.updateMateria);
router.delete('/:id', subjectController.deleteMateria);
router.patch('/state', subjectController.stateMateria);

module.exports = router;
