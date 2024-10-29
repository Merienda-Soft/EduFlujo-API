const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  deleted: { 
    type: Number, 
    required: true,
    default: 0
  },
  status: { 
    type: Number, 
    required: true,
    default: 0
  },
});

module.exports = mongoose.model("materias", SubjectSchema);
