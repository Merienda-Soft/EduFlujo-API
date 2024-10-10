const Tutor = require("../models/tutor");  // Asegúrate de importar correctamente el modelo de Tutor
const { validationResult } = require("express-validator");

// Obtener todos los tutores
const getTutores = async (req, res) => {
    try {
        const tutores = await Tutor.find();  // Obtén todos los tutores
        res.status(200).json(tutores);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los tutores" });
    }
};

// Obtener un tutor por ID
const getTutorById = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.params.id);  // Busca un tutor por su ID
        if (!tutor) {
            return res.status(404).json({ error: "Tutor no encontrado" });
        }
        res.status(200).json(tutor);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el tutor" });
    }
};

// Crear un nuevo tutor
const createTutor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, apellido, telefono } = req.body;

    try {
        const newTutor = new Tutor({
            name,
            apellido,
            telefono
        });

        const tutorSave = await newTutor.save();  // Guardar el nuevo tutor en la base de datos
        res.status(201).json(tutorSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear el tutor" });
    }
};

// Actualizar un tutor
const updateTutor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, apellido, telefono } = req.body;

    try {
        let tutor = await Tutor.findById(req.params.id);
        if (!tutor) {
            return res.status(404).json({ error: "Tutor no encontrado" });
        }

        // Actualizar los datos del tutor
        tutor.name = name || tutor.name;
        tutor.apellido = apellido || tutor.apellido;
        tutor.telefono = telefono || tutor.telefono;

        const tutorUpdate = await tutor.save();  // Guardar los cambios
        res.status(200).json(tutorUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el tutor" });
    }
};

// Eliminar un tutor
const deleteTutor = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.params.id);
        if (!tutor) {
            return res.status(404).json({ error: "Tutor no encontrado" });
        }

        await tutor.remove();  // Eliminar el tutor
        res.status(200).json({ message: "Tutor eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el tutor" });
    }
};

module.exports = {
    getTutores,
    getTutorById,
    createTutor,
    updateTutor,
    deleteTutor,
};
