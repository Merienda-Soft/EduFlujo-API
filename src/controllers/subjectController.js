const Materia = require("../models/subject");  // Asegúrate de importar correctamente el modelo de Materia
const { validationResult } = require("express-validator");

// Obtener todas las materias
const getMaterias = async (req, res) => {
    try {
        const materias = await Materia.find();  // Obtén todas las materias
        console.log(materias)
        res.status(200).json(materias);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las materias" });
    }
};

// Obtener una materia por ID
const getMateriaById = async (req, res) => {
    try {
        const materia = await Materia.findById(req.params.id);  // Busca una materia por su ID
        if (!materia) {
            return res.status(404).json({ error: "Materia no encontrada" });
        }
        res.status(200).json(materia);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la materia" });
    }
};

// Crear una nueva materia
const createMateria = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
        const newMateria = new Materia({
            name
        });

        const materiaSave = await newMateria.save();  // Guardar la nueva materia en la base de datos
        res.status(201).json(materiaSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear la materia" });
    }
};

// Actualizar una materia
const updateMateria = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
        let materia = await Materia.findById(req.params.id);
        if (!materia) {
            return res.status(404).json({ error: "Materia no encontrada" });
        }

        // Actualizar los datos de la materia
        materia.name = name || materia.name;

        const materiaUpdate = await materia.save();  // Guardar los cambios
        res.status(200).json(materiaUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la materia" });
    }
};

// Eliminar una materia
const deleteMateria = async (req, res) => {
    try {
        const materia = await Materia.findById(req.params.id);
        if (!materia) {
            return res.status(404).json({ error: "Materia no encontrada" });
        }

        await materia.remove();  // Eliminar la materia
        res.status(200).json({ message: "Materia eliminada con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la materia" });
    }
};

const stateMateria = async (req, res) => {
    const { id, deleted } = req.body;

    try {
        const materia = await Materia.findById(id);
        if (!materia) {
            return res.status(404).json({ error: "Materia no encontrada" });
        }

        materia.deleted = deleted;
        await materia.save();

        res.status(200).json({ message: `Materia ${deleted === 1 ? 'inactivada' : 'activada'} con éxito` });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el estado de la materia" });
    }
};

module.exports = {
    getMaterias,
    getMateriaById,
    createMateria,
    updateMateria,
    deleteMateria,
    stateMateria,
};
