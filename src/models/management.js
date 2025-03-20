const mongoose = require('mongoose');
const { Schema } = mongoose;

const ManagementSchema = new Schema({
  year: { 
    type: Number, 
    required: true,
    default: () => new Date().getFullYear()
  },
  status: { 
    type: Number, 
    required: false,
    default: 1
  },
  start_date: {
    type: Date,
    required: false,
  },
  end_date: {
    type: Date,
    required: false,
  }
}, { collection: 'management' });;

module.exports = mongoose.model('management', ManagementSchema);