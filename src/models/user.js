const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
},
  password: { 
    type: String, 
    required: true 
},
  rol: { 
    type: String, 
    required: true ,
    enum: ['estudiante', 'profesor'], // Puedes definir los roles válidos aquí
},
  personaid: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'rol'  // 'refPath' es una característica de mongoose para referencias dinámicas
}
});

module.exports = mongoose.model('User', UserSchema);


