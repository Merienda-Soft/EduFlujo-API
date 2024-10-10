const Actividad = require("../models/activity");  // Asegúrate de importar correctamente el modelo de Actividad
const { validationResult } = require("express-validator");

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
            return res.status(404).json({ error: "Actividad no encontrada" });
        }
        res.status(200).json(actividad);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la actividad" });
    }
};

// Crear una nueva actividad
const createActividad = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, fecha, horario, ponderacion, cursoid, materiaid, professorid, tipo, estudiantes, fecha_fin } = req.body;

    try {
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
            estudiantes,  // Array de estudiantes con sus calificaciones
            fecha_fin
        });

        const actividadSave = await newActividad.save();  // Guardar la nueva actividad en la base de datos
        res.status(201).json(actividadSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear la actividad" });
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
            return res.status(404).json({ error: "Actividad no encontrada" });
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
        res.status(200).json(actividadUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la actividad" });
    }
};

// Eliminar una actividad
const deleteActividad = async (req, res) => {
    try {
        const actividad = await Actividad.findById(req.params.id);
        if (!actividad) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        await actividad.remove();  // Eliminar la actividad
        res.status(200).json({ message: "Actividad eliminada con éxito" });
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
};
