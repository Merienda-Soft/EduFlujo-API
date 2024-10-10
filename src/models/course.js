const mongoose = require('mongoose');
const { Schema } = mongoose;

const CourseSchema = new Schema({
  name: { 
    type: String, 
    required: true 
},
  materias: [
    { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'materias' 
    }
]  
});

module.exports = mongoose.model('cursos', CourseSchema);

