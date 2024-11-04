const mongoose = require('mongoose');
const { Schema } = mongoose;

const RegistrationSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  datebirth: { 
    type: String, 
    required: true 
  },
  cursos: [
    {
      type: mongoose.Schema.Types.ObjectId,  
      ref: 'cursos'
    }
  ],
  ci: { 
    type: String, 
    default: "" 
  },
  departamento: { 
    type: String, 
    default: "" 
  },
  gender: { 
    type: String, 
    enum: ["M", "F"], // "M" para masculino y "F" para femenino
    default: "M" 
  },
  localidad: { 
    type: String, 
    default: "" 
  },
  matricula: { 
    type: String, 
    enum: ["EFECTIVO", "RETIRADO", "TRASLADO"], 
    default: "EFECTIVO" 
  },
  pais: { 
    type: String, 
    default: "" 
  },
  provincia: { 
    type: String, 
    default: "" 
  },
  rude: { 
    type: String, 
    default: "" 
  }
}, { collection: 'inscripciones' });

module.exports = mongoose.model('inscripciones', RegistrationSchema);
