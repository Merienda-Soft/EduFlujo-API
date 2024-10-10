const mongoose = require('mongoose');
const { Schema } = mongoose;

const TutorSchema = new Schema({
  name: { 
    type: String, 
    required: true 
},
  apellido: { 
    type: String, 
    required: true 
},
  telefono: { 
    type: String, 
    required: true 
}
});


module.exports = mongoose.model('Tutor', TutorSchema);
