const Attendance = require('../models/attendance ');  // Importar el modelo

// POST /api/attendances
const createAttendance = async (req, res) => {
  const { professorid, courseid, materiaid, date, attendances } = req.body;

  if (!professorid || !courseid || !materiaid || !date || !attendances) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const newAttendance = new Attendance({
      professorid,
      courseid,
      materiaid,
      date: new Date(date),
      attendances,
    });

    const savedAttendance = await newAttendance.save();
    return res.status(201).json(savedAttendance);
  } catch (error) {
    return res.status(500).json({ error: `Error al crear la asistencia: ${error.message}` });
  }
};

const getAttendanceByCourseAndDate = async (req, res) => {
  const { courseid, materiaid, date } = req.query;

  try {
    const attendance = await Attendance.findOne({
      courseid: courseid,
      materiaid: materiaid,
      date: new Date(date)  // Asegúrate de convertir la fecha al formato correcto
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No se encontró asistencia para esa fecha' });
    }

    res.status(200).json(attendance);  // Retorna la asistencia si existe
  } catch (error) {
    res.status(500).json({ error: `Error al obtener la asistencia: ${error.message}` });
  }
};

const getAttendances = async (req, res) => {
    const { professorid, courseid, materiaid, date } = req.query;
  
    if (!professorid || !courseid || !materiaid || !date) {
      return res.status(400).json({ error: 'Todos los parámetros son obligatorios' });
    }
  
    try {
      const attendances = await Attendance.find({
        professorid,
        courseid,
        materiaid,
        date: new Date(date),
      }).populate('attendances.studentid', 'name');  // Usamos `populate` para traer los nombres de los estudiantes
  
      return res.status(200).json(attendances);
    } catch (error) {
      return res.status(500).json({ error: `Error al obtener las asistencias: ${error.message}` });
    }
  };

// PUT /api/attendances/:id
const updateAttendance = async (req, res) => {
  const { id } = req.params;  // ID de la asistencia
  const { attendances } = req.body;  // Nuevas asistencias

  if (!attendances) {
    return res.status(400).json({ error: 'Se requieren las asistencias para actualizar' });
  }

  try {
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      { attendances },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    return res.status(200).json(updatedAttendance);
  } catch (error) {
    return res.status(500).json({ error: `Error al actualizar la asistencia: ${error.message}` });
  }
};

module.exports = {
    createAttendance,
    getAttendanceByCourseAndDate,
    getAttendances,
    updateAttendance
};

