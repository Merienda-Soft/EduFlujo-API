const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre del examen es obligatorio"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "La descripción es obligatoria"],
  },
  fecha: {
    type: Date,
    required: [true, "La fecha es obligatoria"],
  },
  horario: {
    type: String,
    required: [true, "El horario es obligatorio"],
  },
  ponderacion: {
    type: String,
    required: [true, "La ponderación es obligatoria"],
  },
  cursoid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "cursos",
    required: true,
  },
  materiaid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "materias",
    required: true,
  },
  professorid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "profesors",
    required: true,
  },
  tipo: {
    type: Number,
    required: true,
  },
  estudiantes: [
    {
      estudianteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "inscripciones",
      },
      calificacion: {
        type: Number,
        // min: 0,  // Validación mínima
        // max: 100,  // Validación máxima
      },
      _id: false
    },
  ],
  fecha_fin: {
    type: Date,
    required: true,
  },
  management: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
});

module.exports = mongoose.model("actividads", ActivitySchema);
