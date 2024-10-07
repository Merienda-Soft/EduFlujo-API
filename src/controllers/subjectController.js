const subject = require('../models/subject');
const Subject = require('../models/subject');
const { validationResult } = require('express-validator');

const getSubject = async (req, res) => {
    try{
        const subjects = await Subject.find();
        res.status(200).json(subjects);
    }catch(error){
        res.status(500).json({ error: 'Error al obtener las Materias'});_
    }
}

const getSubjectById = async (req, res) => {
    try{
        const subject = await Subject.findById(req.params.id);
        if(!subject){
            return res.status(404).json({error: 'Materia no encontrada'})
        }
        res.status(200).json(subject);
    }catch (error){
        res.status(500).json({ error: 'Error al obtener la Materia'});
    }
};

const createSubject = async (req, res) => {
    const error = validationResult(req);
    if(!error.isEmpty){
        return res.status(400).json({errors: error.array()});
    }
    const {subject_name} = req.body;

    try {
        const newSubject = new Subject({
            subject_name
        })
        //Inicializacion de fechas
        newSubject.create_at = Date.now();
        newSubject.update_at = Date.now();
        const subjectSave = await newSubject.save();
        res.status(201).json(subjectSave);
    }catch(error){
        res.status(500).json({error: 'Error al crear la Materia'});   
    }
}

const updateSubject = async (req, res) => {
    const errors = validation(req);
    if(!errors.isEmpty){
        return res.status(400).json({errors: errors.array()});
    }

    const {subject_name} = req.body;

    try{
        let subject = await Subject.findById(req.params.id);

        subject.subject_name = subject_name || subject.subject_name;
        subject.update_at = Date.now();
        subject.update_at = Date.now();

        const subjectUpdate = await subject.save();
        res.status(200).json(subjectUpdate);
    }catch(error){
        res.status(500).json({error: 'Error al actualizar la Materia'});
    }
}

module.exports = {
    getSubject,
    getSubjectById,
    createSubject,
    updateSubject
}
