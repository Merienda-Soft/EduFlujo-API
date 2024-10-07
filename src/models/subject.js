const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
  subject_name: {
    type: String,
    required: [true, "El nombre de la materia es obligatorio"],
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
});

module.exports = mongoose.model("Subject", SubjectSchema);
