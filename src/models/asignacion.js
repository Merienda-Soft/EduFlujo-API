const mongoose = require('mongoose');
const { Schema } = mongoose;

const AsignacionSchema = new Schema({
  curso: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cursos',  
    required: true
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'profesors',  
    required: true
  },
  materias: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'materias'  
  }]
},
{ collection: 'asignacion' });

module.exports = mongoose.model('Asignacion', AsignacionSchema);
