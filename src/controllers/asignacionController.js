const Asignacion = require('../models/asignacion');
const { validationResult } = require('express-validator');

// Obtener todas las asignaciones
const getAsignaciones = async (req, res) => {
  try {
    const asignaciones = await Asignacion.find()
    res.status(200).json(asignaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las asignaciones' });
  }
};

// Obtener una asignación por ID
const getAsignacionById = async (req, res) => {
  try {
    const asignacion = await Asignacion.findById(req.params.id);
    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }
    res.status(200).json(asignacion);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la asignación' });
  }
};


// Obtener todas las asignaciones por curso id
const getAsignacionesByCurso = async (req, res) => {
  try {
    const asignaciones = await Asignacion.find({ curso: req.params.cursoId }).populate('curso').populate('professor').populate('materias');
    if (!asignaciones || asignaciones.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(asignaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las asignaciones para el curso' });
  }
};

// Crear una nueva asignación
const createAsignacion = async (req, res) => {
  const errors = validationResult(req);
  console.log(req.body)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { curso, professor, materias } = req.body;
  try {
    const newAsignacion = new Asignacion({
      curso,
      professor,
      materias,
    });
    console.log(newAsignacion)
    const asignacionSave = await newAsignacion.save();
    res.status(201).json(asignacionSave);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la asignación' });
  }
};

// Actualizar una asignación
const updateAsignacion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { curso, professor, materias } = req.body;

  try {
    let asignacion = await Asignacion.findById(req.params.id);
    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    asignacion.curso = curso || asignacion.curso;
    asignacion.professor = professor || asignacion.professor;
    asignacion.materias = materias || asignacion.materias;

    const asignacionUpdate = await asignacion.save();
    res.status(200).json(asignacionUpdate);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la asignación' });
  }
};

// Eliminar una asignación
const deleteAsignacion = async (req, res) => {
  try {
    const asignacion = await Asignacion.findById(req.params.id);
    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    await asignacion.remove();
    res.status(200).json({ message: 'Asignación eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la asignación' });
  }
};

module.exports = {
  getAsignaciones,
  getAsignacionById,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion,
  getAsignacionesByCurso
};
