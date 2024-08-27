const Teacher = require('../models/teahcer');
const { validationResult } = require('express-validator');

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los profesores' });
  }
};

const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Profesor no encontrado' });
    }
    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el profesor' });
  }
};

const createTeacher = async (req, res) => {
  console.log(req.body);
  //validar campos
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, first_name, last_name, ci, phone, gender } = req.body;

  try {
    const newTeacher = new Teacher({
      name,
      first_name,
      last_name,
      ci,
      phone,
      gender
    });

    const teacherSave = await newTeacher.save();
    res.status(201).json(teacherSave);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el profesor: ', error });
  }
};

const updateTeacher = async (req, res) => {
  //validar campos
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, first_name, last_name, ci, phone, gender } = req.body;

  try {
    let teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(400).json({ error: 'Profesor no encontrado' });
    }

    teacher.name = name || teacher.name;
    teacher.first_name = first_name || teacher.first_name;
    teacher.last_name = last_name || teacher.last_name;
    teacher.ci = ci || teacher.ci;
    teacher.phone = phone || teacher.phone;
    teacher.gender = gender || teacher.gender;
    teacher.update_at = Date.now();

    const teacherUpdate = await teacher.save();
    res.status(200).json(teacherUpdate);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el profesor' });
  }
};

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
};
