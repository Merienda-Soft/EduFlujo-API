const Student = require('../models/student');
const { validationResult } = require('express-validator');

// Obtener todos los estudiantes
const getStudents = async (req, res) => {
    try {
        const students = await Student.find();
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los estudiantes' });
    }
};

// Obtener un estudiante por ID
const getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el estudiante' });
    }
};

// Crear un nuevo estudiante
const createStudent = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { age, birth_date, ci, first_name, gender, grade_id, last_name, rude, second_last_name, tutor_id } = req.body;

    try {
        const newStudent = new Student({
            age,
            birth_date,
            ci,
            first_name,
            gender,
            grade_id,
            last_name,
            rude,
            second_last_name,
            tutor_id
        });
        const savedStudent = await newStudent.save();
        res.status(201).json(savedStudent);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el estudiante' });
    }
};

// Actualizar un estudiante
const updateStudent = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { age, birth_date, ci, first_name, gender, grade_id, last_name, rude, second_last_name, tutor_id } = req.body;

    try {
        let student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        student.age = age || student.age;
        student.birth_date = birth_date || student.birth_date;
        student.ci = ci || student.ci;
        student.first_name = first_name || student.first_name;
        student.gender = gender || student.gender;
        student.grade_id = grade_id || student.grade_id;
        student.last_name = last_name || student.last_name;
        student.rude = rude || student.rude;
        student.second_last_name = second_last_name || student.second_last_name;
        student.tutor_id = tutor_id || student.tutor_id;
        student.update_at = Date.now();

        const updatedStudent = await student.save();
        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estudiante' });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent
};
