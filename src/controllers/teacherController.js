const Profesor = require("../models/teahcer");  // Asegúrate de importar correctamente el modelo de Profesor
const { validationResult } = require("express-validator");

// Obtener todos los profesores
const getProfesores = async (req, res) => {
    try {
        const profesores = await Profesor.find().populate({
          path: 'cursos', 
          populate: {
            path: 'materias',  
            select: 'name'  
          }
        });  // Obtén todos los profesores
        res.status(200).json(profesores);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los profesores" });
    }
};

// Obtener un profesor por ID
const getProfesorById = async (req, res) => {
    try {
        const profesor = await Profesor.findById(req.params.id).populate({
          path: 'cursos', 
          populate: {
            path: 'materias',  
            select: 'name'  
          }
        });  // Busca un profesor por su ID
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
        const profesor = await Profesor.findOne({email: req.params.email}).populate({
          path: 'cursos', 
          populate: {
            path: 'materias',  
            select: 'name'  
          }
        });  // Busca un profesor por su ID
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }
        res.status(200).json(profesor);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el profesor por email" });
    }
};

// Crear un nuevo profesor
const createProfesor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, datebirth, cursos } = req.body;

    try {
        const newProfesor = new Profesor({
            name,
            datebirth,
            cursos
        });

        const profesorSave = await newProfesor.save();  // Guardar el nuevo profesor en la base de datos
        res.status(201).json(profesorSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear el profesor" });
    }
};

// Actualizar un profesor
const updateProfesor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, datebirth, cursos } = req.body;

    try {
        let profesor = await Profesor.findById(req.params.id);
        if (!profesor) {
            return res.status(404).json({ error: "Profesor no encontrado" });
        }

        // Actualizar los datos del profesor
        profesor.name = name || profesor.name;
        profesor.datebirth = datebirth || profesor.datebirth;
        profesor.cursos = cursos || profesor.cursos;

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
