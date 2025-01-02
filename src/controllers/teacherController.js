const Profesor = require("../models/teacher");  // Asegúrate de importar correctamente el modelo de Profesor
const Asignacion = require('../models/asignacion');
const { validationResult } = require("express-validator");

// Obtener todos los profesores
const getProfesores = async (req, res) => {
    try {
        const profesores = await Profesor.find().populate('name email');
        res.status(200).json(profesores);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los profesores" });
    }
};

// Obtener un profesor por ID
const getProfesorById = async (req, res) => {
    try {
        const profesor = await Profesor.findById(req.params.id).populate('name email');
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }
        res.status(200).json(profesor);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el profesor" });
    }
};

const getProfesorByEmail = async (req, res) => {
    try {
        const profesor = await Profesor.findOne({email: req.params.email})
        
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }

        const asignaciones = await Asignacion.find({ professor: profesor.id })
        const profesorConAsignaciones = {
            ...profesor.toObject(), 
            asignaciones: asignaciones
        };
        
        res.status(200).json(profesorConAsignaciones);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ error: "Error al obtener el profesor por email", details: error.message });
    }
};

// Crear un nuevo profesor
const createProfesor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;

    try {
        // Imprimir la data que se está recibiendo
        console.log('Datos recibidos:', cursos);

        const newProfesor = new Profesor({
            name,
            email
        });

        const profesorSave = await newProfesor.save();
        res.status(201).json(profesorSave);
    } catch (error) {
        // Manejar errores con más detalle
        console.error('Error al crear el profesor:', error);
        res.status(500).json({ error: `Error al crear el profesor: ${error.message}` });
    }
};


// Actualizar un profesor
const updateProfesor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;

    try {
        let profesor = await Profesor.findById(req.params.id);
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }

        // Actualizar los datos del profesor
        profesor.name = name || profesor.name;
        profesor.email = email || profesor.email;

        const profesorUpdate = await profesor.save();  // Guardar los cambios
        res.status(200).json(profesorUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el profesor" });
    }
};

// Eliminar un profesor
const deleteProfesor = async (req, res) => {
    try {
        const profesor = await Profesor.findById(req.params.id);
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }

        await profesor.remove();  // Eliminar el profesor
        res.status(200).json({ message: "Profesor eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el profesor" });
    }
};

module.exports = {
    getProfesores,
    getProfesorById,
    getProfesorByEmail,
    createProfesor,
    updateProfesor,
    deleteProfesor,
};
