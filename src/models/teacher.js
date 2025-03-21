const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeacherSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('profesors', TeacherSchema);
