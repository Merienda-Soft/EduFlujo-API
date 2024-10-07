const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    age: { type: Number, required: true },
    birth_date: { type: Date, required: true },
    ci: { type: String, required: true },
    create_at: { type: Date, default: Date.now },
    first_name: { type: String, required: true },
    gender: { type: Number, required: true },
    grade_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', required: true },
    last_name: { type: String, required: true },
    rude: { type: String, required: true },
    second_last_name: { type: String, required: true },
    tutor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
    update_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
