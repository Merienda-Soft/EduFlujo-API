const Activity = require('../models/activity');
const { validationResult } = require('express-validator');

const getActivities = async (req, res) => {
    try{
        const activities = await Activity.find();
        res.status(200).json(activities);
    }catch(error){
        res.status(500).json({ error: 'Error al obtener las catividades'});_
    }
}

const getActivityById = async (req, res) => {
    try{
        const activity = await Activity.findById(req.params.id);
        if(!activity){
            return res.status(404).json({error: 'actividad no encontrada'})
        }
        res.status(200).json(activity);
    }catch (error){
        res.status(500).json({ error: 'Error al obtener la actividad'});
    }
};

const createActivity = async (req, res) => {
    const error = validationResult(req);
    if(!error.isEmpty){
        return res.status(400).json({errors: error.array()});
    }
    const {activity_name, month, quarter, score, class_id} = req.body;

    try {
        const newActivity = new Activity({
            activity_name,
            month,
            quarter,
            score,
            class_id
        })
        const activitySave = await newActivity.save();
        res.status(201).json(activitySave);
    }catch(error){
        res.status(500).json({error: 'Error al crear la actividad'});   
    }
}

const updateActivity = async (req, res) => {
    const errors = validation(req);
    if(!errors.isEmpty){
        return res.status(400).json({errors: errors.array()});
    }

    const {activity_name, month, quarter, score, class_id} = req.body;

    try{
        let activity = await Activity.findById(req.params.id);
        if(!teacher){
            return res.status(400).json({error: 'Actividad no encontrada'});
        }

        activity.activity_name = activity_name || activity.activity_name;
        activity.month = month || activity.nonth;
        activity.quarter = quarter || activity.quarter;
        activity.score = score || activity.score;
        activity.class_id = class_id || activity.class_id;
        activity.update_at = Date.now();

        const activityUpdate = await activity.save();
        res.status(200).json(activityUpdate);
    }catch(error){
        res.status(500).json({error: 'Error al actualizar la actividad'});
    }
}

module.exports = {
    getActivities,
    getActivityById,
    createActivity,
    updateActivity
}
