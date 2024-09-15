const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

router.get('/', teacherController.getTeachers);
router.get('/:id', teacherController.getTeacherById);
router.post('/', teacherController.createTeacher);
router.put('/:id', teacherController.updateTeacher);

module.exports = router;
