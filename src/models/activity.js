const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  activity_name: {
    type: String,
    required: [true, "El nombre de la actividad es obligatorio"],
    trim: true,
  },
  month: {
    type: Number,
    required: false,
    default: 0,
  },
  quarter: {
    type: Number,
    required: false,
    default: 0,
  },
  score: {
    type: Number,
    required: false,
    default: 0,
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Class",
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

module.exports = mongoose.model("Activity", ActivitySchema);
