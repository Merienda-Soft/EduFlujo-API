const pdf = require('pdf-parse');

// Método para procesar el archivo PDF
const parsePdf = async (req, res) => {
  try {
    // Verificar que se haya subido un archivo PDF
    if (!req.file || req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Por favor, sube un archivo PDF.' });
    }

    // Leer el contenido del archivo PDF
    const dataBuffer = req.file.buffer;
    const pdfData = await pdf(dataBuffer);

    // Extraer el texto del PDF
    const textContent = pdfData.text;
    console.log("Texto extraído del PDF:", textContent);

    // Aplicar la función de parseo para extraer los datos de estudiantes
    const students = parseStudentData(textContent);

    // Devolver los datos en formato JSON
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Error procesando el archivo PDF.' });
  }
};

// Función para extraer datos de estudiantes a partir del texto del PDF
const parseStudentData = (text) => {
  const students = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log("Líneas extraídas:", lines);
  let currentStudent = null;

  // Diccionario de meses en español para conversión de fechas
  const months = {
    "ene": 0, "feb": 1, "mar": 2, "abr": 3, "may": 4, "jun": 5,
    "jul": 6, "ago": 7, "sep": 8, "oct": 9, "nov": 10, "dic": 11
  };

  lines.forEach((line) => {
    // Detectar el código RUDE (número de 9 dígitos al inicio de la línea)
    const rudeMatch = line.match(/^\d{9}/);
    if (rudeMatch) {
      if (currentStudent) {
        students.push(currentStudent);
      }
      currentStudent = {
        codigoRude: rudeMatch[0],
        carnet: '',
        nombreCompleto: '',
        genero: '',
        fechaNacimiento: '',
        pais: '',
        departamento: '',
        provincia: '',
        localidad: '',
        matricula: ''
      };
      line = line.replace(rudeMatch[0], '').trim();
    }

    if (currentStudent) {
      // Identificar carnet de identidad
      const carnetMatch = line.match(/\b\d{7,10}\b/);
      if (carnetMatch && !currentStudent.carnet) {
        currentStudent.carnet = carnetMatch[0];
        line = line.replace(carnetMatch[0], '').trim();
      }

      // Nombre completo (si solo contiene letras mayúsculas y espacios)
      if (!currentStudent.nombreCompleto && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(line)) {
        currentStudent.nombreCompleto = line;
      }

      // Género (F o M)
      if (!currentStudent.genero && (line.trim() === "F" || line.trim() === "M")) {
        currentStudent.genero = line.trim();
      }

      // Fecha de nacimiento en formato 'DD de MMM. YYYY'
      const dateMatch = line.match(/(\d{1,2})\sde\s(\w+)\.\s(\d{4})/);
      if (dateMatch && !currentStudent.fechaNacimiento) {
        const day = parseInt(dateMatch[1], 10);
        const month = months[dateMatch[2].substring(0, 3).toLowerCase()];
        const year = parseInt(dateMatch[3], 10);
        currentStudent.fechaNacimiento = new Date(year, month, day).toLocaleDateString();
      }

      // País, Departamento, Provincia, Localidad (asume que es una secuencia de palabras mayúsculas)
      if (!currentStudent.pais && /[A-ZÁÉÍÓÚÑ\s]+/.test(line)) {
        const locationParts = line.split(' ');
        currentStudent.pais = locationParts[0] || '';
        currentStudent.departamento = locationParts[1] || '';
        currentStudent.provincia = locationParts[2] || '';
        currentStudent.localidad = locationParts.slice(3).join(' ') || '';
      }

      // Matrícula (EFECTIVO, RETIRADO o TRASLADO)
      if (!currentStudent.matricula && /^(EFECTIVO|RETIRADO|TRASLADO)$/.test(line)) {
        currentStudent.matricula = line.trim();
      }
    }
  });

  // Agregar el último estudiante si existe
  if (currentStudent) {
    students.push(currentStudent);
  }

  console.log("Estudiantes extraídos:", students);
  return students;
};

module.exports = { parsePdf };
