const mongoose = require('mongoose');
const Management = require("../models/management"); 
const Curso = require('../models/course');
const { validationResult } = require("express-validator");

const getManagementNow = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const management = await Management.findOne({ status: 1 });
        
        if (!management) {
            return res.status(404).json({ message: "Informacion no encontrada para la gestion actual" });
        }
        
        res.status(200).json(management);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

const getManagements = async (req, res) => {
  try {
      const managements = await Management.find();
      
      if (!managements) {
          return res.status(404).json({ message: "No hay gestiones" });
      }
      
      res.status(200).json(managements);
  } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ message: "Server error", error });
  }
};

const createManagement = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { year, start_date, end_date, cursos, materias } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newManagement = new Management({
      year,
      start_date,
      end_date,
    });

    const managementSave = await newManagement.save({ session });

    const cursosToSave = cursos.map(curso => ({
      name: curso.name,
      materias: materias.map(materia => new mongoose.Types.ObjectId(materia)),
      management: year, 
    }));

    const cursosSave = await Curso.insertMany(cursosToSave, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ management: managementSave, cursos: cursosSave });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Transaction Error:', error);
    res.status(500).json({ error: "Error al crear el management y los cursos", details: error.message });
  }
};
  
const deleteManagement = async (req, res) => {
    try {
      const { id } = req.params;
      const management = await Management.findByIdAndUpdate(id, { status: 0 }, { new: true });
  
      if (!management) {
        return res.status(404).json({ message: "Management not found" });
      }
  
      res.status(200).json(management);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {
    getManagementNow,
    createManagement,
    deleteManagement,
    getManagements
};