const mongoose = require('mongoose');
const { Schema } = mongoose;

const CourseSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  deleted: { 
    type: Number, 
    required: false,
    default: 0
  },
  status: { 
    type: Number, 
    required: false,
    default: 0
  },
  materias: [
    { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'materias' 
    }
  ]  
});

module.exports = mongoose.model('cursos', CourseSchema);

