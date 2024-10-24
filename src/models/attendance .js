const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  professorid: {
    type: Schema.Types.ObjectId,
    ref: 'Professor',  // Relación con la colección 'professors'
    required: true,
  },
  courseid: {
    type: Schema.Types.ObjectId,
    ref: 'Course',  // Relación con la colección 'cursos'
    required: true,
  },
  materiaid: {
    type: Schema.Types.ObjectId,
    ref: 'Materia',  // Relación con la colección 'materias'
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  attendances: [
    {
      studentid: {
        type: Schema.Types.ObjectId,
        ref: 'Inscripcion',  // Relación con la colección 'inscripciones'
        required: true,
      },
      present: {
        type: Boolean,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
