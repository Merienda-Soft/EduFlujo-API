const mongoose = require('mongoose');
const { Schema } = mongoose;
const CursoSchema = require('./subject'); 

const RegistrationSchema = new Schema({
  name: { 
    type: String, 
    required: true 
}, 
  datebirth: { 
    type: Date, 
    required: true 
}, 
cursos: [
    {
      type: mongoose.Schema.Types.ObjectId,  
      ref: 'cursos' 
    }
  ]
});

module.exports = mongoose.model('inscripciones', RegistrationSchema);

; 

