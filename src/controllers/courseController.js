const Curso = require("../models/course");  // Asegúrate de importar correctamente el modelo de Curso
const { validationResult } = require("express-validator");

// Obtener todos los cursos
const getCursos = async (req, res) => {
    try {
        const cursos = await Curso.find().populate("materias", "name deleted status");  // Obtén todos los cursos y carga los nombres de las materias
        res.status(200).json(cursos);
        console.log(cursos)
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los cursos" });
    }
};

// Obtener un curso por ID
const getCursoById = async (req, res) => {
    try {
        const curso = await Curso.findById(req.params.id).populate("materias", "name");  // Busca un curso por su ID y carga los nombres de las materias
        if (!curso) {
            return res.status(404).json({ error: "Curso no encontrado" });
        }
        res.status(200).json(curso);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el curso" });
    }
};

// Crear un nuevo curso
const createCurso = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, materias } = req.body;

    try {
        const newCurso = new Curso({
            name,
            materias  // Array de materias que contiene el curso
        });

        const cursoSave = await newCurso.save();  // Guardar el nuevo curso en la base de datos
        res.status(201).json(cursoSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear el curso" });
    }
};

// Actualizar un curso
const updateCurso = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, materias } = req.body;

    try {
        let curso = await Curso.findById(req.params.id);
        if (!curso) {
            return res.status(404).json({ error: "Curso no encontrado" });
        }

        // Actualizar los datos del curso
        curso.name = name || curso.name;
        curso.materias = materias || curso.materias;

        const cursoUpdate = await curso.save();  // Guardar los cambios
        res.status(200).json(cursoUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el curso" });
    }
};

// Eliminar un curso
const deleteCurso = async (req, res) => {
    try {
        const curso = await Curso.findById(req.params.id);
        if (!curso) {
            return res.status(404).json({ error: "Curso no encontrado" });
        }

        curso.deleted = 1;

        await curso.save();  

        res.status(200).json({ message: "Curso eliminado de manera lógica con éxito" });
    } catch (error) {
        console.error('Error al eliminar el curso de manera lógica:', error);
        res.status(500).json({ error: "Error al eliminar el curso de manera lógica" });
    }
};

module.exports = {
    getCursos,
    getCursoById,
    createCurso,
    updateCurso,
    deleteCurso,
};
