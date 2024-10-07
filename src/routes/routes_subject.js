const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

router.get('/', subjectController.getSubject);
router.get('/:id', subjectController.getSubjectById);
router.post('/', subjectController.createSubject);
router.put('/:id', subjectController.updateSubject);

module.exports = router;
