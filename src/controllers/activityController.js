const Actividad = require("../models/activity");
const Inscripcion = require('../models/registration'); 
const { validationResult } = require("express-validator");
const mongoose = require('mongoose');

// Obtener todas las actividades
const getActividades = async (req, res) => {
    try {
        const actividades = await Actividad.find()
            .populate("cursoid", "name")
            .populate("materiaid", "name")
            .populate("professorid", "name")
            .populate("estudiantes.estudianteId", "name");  // Carga el nombre de los estudiantes asociados
        res.status(200).json(actividades);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las actividades" });
    }
};

// Obtener una actividad por ID
const getActividadById = async (req, res) => {
    try {
        const actividad = await Actividad.findById(req.params.id)
            .populate("cursoid", "name")
            .populate("materiaid", "name")
            .populate("professorid", "name")
            .populate("estudiantes.estudianteId", "name");  // Carga el nombre de los estudiantes asociados
        if (!actividad) {
            return res.status(404).json({ "ok": false, error: "Actividad no encontrada" });
        }
        res.status(200).json({"ok": true, "actividad": actividad});
    } catch (error) {
        res.status(500).json({"ok": false, error: `Error al obtener la actividad -> ${error} ` });
    }
};

//by materiaId, CursoId, teacherId
const getFilteredActivities = async (req, res) => {
    const { materiaid, cursoid, teacherid } = req.query;  
    
    try {
        const actividades = await Actividad.find({
            materiaid: new mongoose.Types.ObjectId(materiaid),
            cursoid: new mongoose.Types.ObjectId(cursoid),
            professorid: new mongoose.Types.ObjectId(teacherid)  // Asegúrate de usar el campo correcto, aquí es 'professorid'
        })
        .populate("cursoid", "name")
        .populate("materiaid", "name")
        .populate("professorid", "name")
        .populate("estudiantes.estudianteId", "name");

        if (actividades.length === 0) {
            return res.status(404).json({ error: "No se encontraron actividades con esos filtros" });
        }

        res.status(200).json(actividades);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las actividades", err: error.message });
    }
};

// Crear una nueva actividad
const createActividad = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, fecha, horario, ponderacion, cursoid, materiaid, professorid, tipo, fecha_fin } = req.body;


    try {
        const courseObjectId = new mongoose.Types.ObjectId(cursoid);
        const materiaObjectId = new mongoose.Types.ObjectId(materiaid);

      const inscripciones = await Inscripcion.find({
        curso: courseObjectId
      });

        const estudiantesArray = inscripciones.map(inscripcion => ({
            estudianteId: inscripcion._id,  
            calificacion: 0  
        }));

        const newActividad = new Actividad({
            name,
            description,
            fecha,
            horario,
            ponderacion,
            cursoid,
            materiaid,
            professorid,
            tipo,
            estudiantes: estudiantesArray,
            fecha_fin
        });

        const actividadSave = await newActividad.save(); 
        res.status(201).json(actividadSave);

    } catch (error) {
        res.status(500).json({ error: "Error al crear la actividad" + error });
    }
};

// Actualizar una actividad
const updateActividad = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, fecha, horario, ponderacion, cursoid, materiaid, professorid, tipo, estudiantes, fecha_fin } = req.body;

    try {
        let actividad = await Actividad.findById(req.params.id);
        if (!actividad) {
            return res.status(404).json({ok: false, error: "Actividad no encontrada" });
        }

        // Actualizar los datos de la actividad
        actividad.name = name || actividad.name;
        actividad.description = description || actividad.description;
        actividad.fecha = fecha || actividad.fecha;
        actividad.horario = horario || actividad.horario;
        actividad.ponderacion = ponderacion || actividad.ponderacion;
        actividad.cursoid = cursoid || actividad.cursoid;
        actividad.materiaid = materiaid || actividad.materiaid;
        actividad.professorid = professorid || actividad.professorid;
        actividad.tipo = tipo || actividad.tipo;
        actividad.estudiantes = estudiantes || actividad.estudiantes;
        actividad.fecha_fin = fecha_fin || actividad.fecha_fin;

        const actividadUpdate = await actividad.save();  // Guardar los cambios
        res.status(200).json({ok: true, status:1});
    } catch (error) {
        res.status(500).json({ok: false, error: "Error al actualizar la actividad" });
    }
};

// Eliminar una actividad
const deleteActividad = async (req, res) => {
    try {
        const actividad = await Actividad.findByIdAndDelete(req.params.id);
        if (!actividad) {
            return res.status(404).json({ "ok": false });
        }

        res.status(200).json({ "ok": true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la actividad" });
    }
};

module.exports = {
    getActividades,
    getActividadById,
    createActividad,
    updateActividad,
    deleteActividad,
    getFilteredActivities
};
