const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeacherSchema = new Schema({
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

module.exports = mongoose.model('profesors', TeacherSchema);
