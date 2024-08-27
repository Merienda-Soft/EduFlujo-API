const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    first_name: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
    },
    last_name: {
      type: String,
      required: false,
      trim: true,
    },
    ci: {
      type: String,
      required: [true, 'El C.I es requerido'],
    },
    phone: {
      type: Number,
      required: [true, 'El numero celular es requerido'],
      trim: true,
    },
    gender: {
      type: Number,
      required: true,
      trim: true,
    },
    create_at: {
      type: Date,
      default: Date.now(),
    },
    update_at: {
      type: Date,
      required: false,
    },
  }
);

module.exports = mongoose.model('professors', TeacherSchema);
