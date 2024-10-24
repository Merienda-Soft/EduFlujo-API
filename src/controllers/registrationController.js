const Inscripcion = require("../models/registration");  // Asegúrate de importar correctamente el modelo de Inscripcion
const { validationResult } = require("express-validator");
const mongoose = require('mongoose');

const getStudentsByCourseAndSubject = async (req, res) => {
    try {
        const { courseid, materiaid } = req.query;

    // Validar si los IDs son válidos ObjectId de MongoDB
    if (!mongoose.Types.ObjectId.isValid(courseid) || !mongoose.Types.ObjectId.isValid(materiaid)) {
      return res.status(400).json({ error: 'courseid o materiaid no son ObjectId válidos' });
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseid);
    const materiaObjectId = new mongoose.Types.ObjectId(materiaid);

      const students = await Inscripcion.find({
        cursos: {
          $elemMatch: {  // Busca dentro del array de cursos
            courseid: courseObjectId,  // Coincide con el courseid como ObjectId
            materiaid: { $in: [materiaObjectId] }  // Verifica que el materiaid esté en el array de materias
          }
        }
      });
      
      
  
      if (students.length === 0) {
        return res.status(404).json({ message: 'No se encontraron estudiantes para este curso ' });
      }
  
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ error: `Error al obtener los estudiantes: ${error.message}` });
    }
  };

// Obtener todas las inscripciones
const getInscripciones = async (req, res) => {
    try {
        const inscripciones = await Inscripcion.find().populate({
            path: 'cursos', 
            populate: {
              path: 'materias',  
              select: 'name'  
            }
          }); 
        res.status(200).json(inscripciones);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las inscripciones" });
    }
};

// Obtener una inscripción por ID
const getInscripcionById = async (req, res) => {
    try {
        const inscripcion = await Inscripcion.findById(req.params.id);  // Busca una inscripción por su ID
        if (!inscripcion) {
            return res.status(404).json({ error: "Inscripción no encontrada" });
        }
        res.status(200).json(inscripcion);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la inscripción" });
    }
};

// Crear una nueva inscripción
const createInscripcion = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, datebirth, cursos } = req.body;

    try {
        const newInscripcion = new Inscripcion({
            name,
            datebirth,
            cursos
        });

        const inscripcionSave = await newInscripcion.save();  // Guardar la nueva inscripción en la base de datos
        res.status(201).json(inscripcionSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear la inscripción" });
    }
};

// Actualizar una inscripción
const updateInscripcion = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, datebirth, cursos } = req.body;

    try {
        let inscripcion = await Inscripcion.findById(req.params.id);
        if (!inscripcion) {
            return res.status(404).json({ error: "Inscripción no encontrada" });
        }

        // Actualizar los datos de la inscripción
        inscripcion.name = name || inscripcion.name;
        inscripcion.datebirth = datebirth || inscripcion.datebirth;
        inscripcion.cursos = cursos || inscripcion.cursos;

        const inscripcionUpdate = await inscripcion.save();  // Guardar los cambios
        res.status(200).json(inscripcionUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la inscripción" });
    }
};

// Eliminar una inscripción
const deleteInscripcion = async (req, res) => {
    try {
        const inscripcion = await Inscripcion.findById(req.params.id);
        if (!inscripcion) {
            return res.status(404).json({ error: "Inscripción no encontrada" });
        }

        await inscripcion.remove();  // Eliminar la inscripción
        res.status(200).json({ message: "Inscripción eliminada con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la inscripción" });
    }
};

module.exports = {
    getInscripciones,
    getInscripcionById,
    createInscripcion,
    updateInscripcion,
    deleteInscripcion,
    getStudentsByCourseAndSubject
};
