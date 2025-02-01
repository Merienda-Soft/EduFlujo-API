const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const archiver = require('archiver');
const Actividad = require("../models/activity");
const Registration = require("../models/registration");
const Materia = require("../models/subject");
const Inscripcion = require("../models/registration");

// Ruta de la plantilla
const templatePath = path.join(
  __dirname,
  "..",
  "templates",
  "_PRIMARIA REGISTRO_1_TRIMESTRE.xlsx"
);

let colum = {
  2: {
    2: "D",
    3: "J",
  },
  3: {
    2: "E",
    3: "K",
  },
  4: {
    2: "F",
    3: "L",
  },
  5: {
    2: "D",
    3: "J",
  },
  6: {
    2: "E",
    3: "K",
  },
  8: {
    2: "F",
    3: "L",
  },
  9: {
    2: "D",
    3: "J",
  },
  10: {
    2: "E",
    3: "K",
  },
  11: {
    2: "F",
    3: "L",
  },
};

const MONTH_MAP = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

let estudensSheet = [];

const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toString()
    .replace(/\n/g, " ") // replace line breaks with space
    .replace(/[\r@#&*()]/g, "") // remove special chars
    .replace(/\s+/g, " ") // collapse multiple spaces into one
    .toLowerCase()
    .trim();
};

const getFila = (nombre) => {
  let file = estudensSheet.find((est) => {
    const normalizedEst = normalizeText(est.text);
    const normalizedNombre = normalizeText(nombre);
    return normalizedEst === normalizedNombre;
  });
  return file;
};

// Add Date.year() helper
Date.year = function () {
  return new Date().getFullYear();
};

const parseBirthDate = (dateStr) => {
  try {
    // Split "15 de may. de 2012" into parts
    const parts = dateStr.toLowerCase().split(" de ");
    const dia = parts[0].padStart(2, "0"); // Add leading zero if needed
    const mes = MONTH_MAP[parts[1].replace(".", "")]; // Remove dot from month abbrev
    const año = parts[2];

    return { dia, mes, año };
  } catch (error) {
    console.error("Error parsing birth date:", dateStr);
    return { dia: "", mes: "", año: "" };
  }
};

const generateExcelReport = async (req, res) => {
  try {
    const { professorId, cursoId } = req.query;
    const year = Date.year();
    const baseExcelPath = path.join(
      __dirname,
      "..",
      "temp",
      `curso_${cursoId}_${year}.xlsx`
    );

    // Check if base excel exists
    let workbook;
    if (!fs.existsSync(baseExcelPath)) {
      console.log("Creating new base excel with student data...");
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      const filiacionSheet = workbook.getWorksheet("FILIACIÓN");
      if (!filiacionSheet) {
        throw new Error("Sheet FILIACIÓN not found in template");
      }

      const studentsResult = await getStudentsByCourse(cursoId);

      // Sort students by apellido
      const students = studentsResult.data.sort((a, b) => {
        const nameA = a.name.split("\n").join(" ").toUpperCase();
        const nameB = b.name.split("\n").join(" ").toUpperCase();
        return nameA.localeCompare(nameB);
      });

      // Write student data starting from row 8
      let row = 8;
      // Read student names once per sheet
      students.forEach((student) => {
        // Split full name into parts
        const fullName = student.name.split("\n").join(" ").trim();
        const nameParts = fullName.split(" ");
        let apPaterno = "",
          apMaterno = "",
          nombres = "";

        if (nameParts.length >= 3) {
          apPaterno = nameParts[0];
          apMaterno = nameParts[1];
          nombres = nameParts.slice(2).join(" ");
        } else if (nameParts.length === 2) {
          apPaterno = nameParts[0];
          nombres = nameParts[1];
        } else {
          nombres = nameParts[0];
        }

        // Parse birth date
        const { dia, mes, año } = parseBirthDate(student.datebirth);
        const edad = year - parseInt(año);

        // Write data
        filiacionSheet.getCell(`B${row}`).value = apPaterno;
        filiacionSheet.getCell(`C${row}`).value = apMaterno;
        filiacionSheet.getCell(`D${row}`).value = nombres;
        filiacionSheet.getCell(`E${row}`).value = student.rude;
        filiacionSheet.getCell(`F${row}`).value = student.ci;
        filiacionSheet.getCell(`G${row}`).value = dia;
        filiacionSheet.getCell(`H${row}`).value = mes;
        filiacionSheet.getCell(`I${row}`).value = año;
        // filiacionSheet.getCell(`J${row}`).value = edad;
        filiacionSheet.getCell(`K${row}`).value = student.gender;

        row++;
      });

      // Save base excel
      await workbook.xlsx.writeFile(baseExcelPath);
    }

    // Continue with existing code for grade processing...
    const result = await getTasksFrom(professorId, cursoId);
    // Define trimesters
    const TRIMESTER_MONTHS = {
      1: [2, 3, 4],
      2: [5, 6, 8],
      3: [9, 10, 11],
    };

    // Map materias to worksheet names
    const SHEET_NAMES = {
      Lenguaje: "LENG",
      "Ciencias Sociales": "CIEN SOC",
      "Educación Física": "ED FISICA",
      "Educación Musical": "ED MUSICA",
      "Artes Plásticas": "ARTES PL",
      Matemática: "MATE",
      "Técnica y Tecnológia": "TECN TECN",
      "Ciencias Naturales": "CIEN NAT",
      Religión: "RELIGION",
      // Add other mappings
    };

    // Group data by trimester
    const trimesterData = result.data.reduce((acc, materia) => {
      // Group by trimester first
      for (const [trimester, validMonths] of Object.entries(TRIMESTER_MONTHS)) {
        // Filter months that belong to this trimester
        const trimesterMonths = materia.months.filter((m) =>
          validMonths.includes(m.month)
        );

        if (trimesterMonths.length > 0) {
          if (!acc[trimester]) {
            acc[trimester] = {};
          }

          // Group by materia
          if (!acc[trimester][materia.materiaName]) {
            acc[trimester][materia.materiaName] = {};
          }

          // Group by month
          trimesterMonths.forEach((monthData) => {
            acc[trimester][materia.materiaName][monthData.month] = {
              tipo2: monthData.typeAverages.find((t) => t.tipo === "2") || null,
              tipo3: monthData.typeAverages.find((t) => t.tipo === "3") || null,
            };
          });
        }
      }
      return acc;
    }, {});

    // Generate report for each trimester
    for (const [trimester, materiaData] of Object.entries(trimesterData)) {
      // Create new workbook from template for this trimester

      const workbook = new ExcelJS.Workbook();
      const basePath = path.join(
        __dirname,
        "..",
        "temp",
        `curso_${cursoId}_${year}.xlsx`
      );
      await workbook.xlsx.readFile(basePath);

      // Process each materia in this trimester
      for (const [materiaName, monthData] of Object.entries(materiaData)) {
        const sheetName = SHEET_NAMES[materiaName];
        if (!sheetName) {
          console.log(`No sheet mapping found for: ${materiaName}`);
          continue;
        }

        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
          console.log(`Worksheet not found: ${sheetName}`);
          continue;
        }

        estudensSheet = [];
        let row = 8;
        while (row < 35) {
          const cell = worksheet.getCell(`B${row}`);
          let fullName = "";

          if (cell._value?.type === 6) {
            // Formula cell
            const filiacionSheet = workbook.getWorksheet("FILIACIÓN");
            if (filiacionSheet) {
              // Get all name parts from FILIACIÓN
              const apPaterno =
                filiacionSheet.getCell(`B${row}`).value?.toString() || "";
              const apMaterno =
                filiacionSheet.getCell(`C${row}`).value?.toString() || "";
              const nombres =
                filiacionSheet.getCell(`D${row}`).value?.toString() || "";

              // Concatenate full name
              fullName = [apPaterno, apMaterno, nombres]
                .filter((part) => part.trim())
                .join(" ");
            }
          }

          if (!fullName.trim()) {
            break;
          }

          estudensSheet.push({
            id: row,
            text: fullName.trim(),
          });

          row++;
        }

        // Process each month's data
        for (const [month, types] of Object.entries(monthData)) {
          // Process tipo2 grades
          if (types.tipo2) {
            const column = colum[month]["2"];
            types.tipo2.studentAverages.forEach((student) => {
              const fila = getFila(student.nombre);
              if (fila && column) {
                const cell = worksheet.getCell(`${column}${fila.id}`);
                const convertedGrade = Math.round(
                  (student.promedio * 45) / 100
                );
                cell.value = convertedGrade;
              }
            });
          }

          // Process tipo3 grades
          if (types.tipo3) {
            const column = colum[month]["3"];
            types.tipo3.studentAverages.forEach((student) => {
              const fila = getFila(student.nombre);
              if (fila && column) {
                const cell = worksheet.getCell(`${column}${fila.id}`);
                const convertedGrade = Math.round(
                  (student.promedio * 40) / 100
                );
                cell.value = convertedGrade;
              }
            });
          }
        }
      }

      // Save trimester report
      const tempPath = path.join(
        __dirname,
        "..",
        "temp",
        `trimestre_${trimester}_${cursoId}_${Date.year()}.xlsx`
      );

      await workbook.xlsx.writeFile(tempPath);
    }

    // After generating all reports, create zip
    const zipPath = path.join(__dirname, '..', 'temp', `reportes_${cursoId}_${year}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => {
        // Send zip file
        res.download(zipPath, `reportes_${cursoId}_${year}.zip`, (err) => {
            if (err) {
                console.error('Error downloading zip:', err);
            }
            // Clean up
            fs.unlinkSync(zipPath);
            // Delete individual excel files
            for (let i = 1; i <= 3; i++) {
                const excelPath = path.join(__dirname, '..', 'temp', 
                    `trimestre_${i}_${cursoId}_${year}.xlsx`);
                if (fs.existsSync(excelPath)) {
                    fs.unlinkSync(excelPath);
                }
            }
        });
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);

    // Add excel files to zip
    for (let i = 1; i <= 3; i++) {
        const excelPath = path.join(__dirname, '..', 'temp', 
            `trimestre_${i}_${cursoId}_${year}.xlsx`);
        if (fs.existsSync(excelPath)) {
            archive.file(excelPath, { 
                name: `Trimestre_${i}_${year}.xlsx` 
            });
        }
    }

    await archive.finalize();

  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
      msg: "Error al generar el reporte",
    });
  }
};

const getTasksFrom = async (professorId, cursoId) => {
  try {
    const tasks = await Actividad.find({
      professorid: professorId,
      cursoid: cursoId,
    });

    // Get all registrations and materias for lookup
    const [registrations, materias] = await Promise.all([
      Registration.find(),
      Materia.find(),
    ]);

    const studentMap = registrations.reduce((acc, reg) => {
      acc[reg._id] = reg.name;
      return acc;
    }, {});

    const materiaMap = materias.reduce((acc, mat) => {
      acc[mat._id] = mat.name;
      return acc;
    }, {});

    const groupedByMateria = tasks.reduce((acc, task) => {
      if (!acc[task.materiaid]) {
        acc[task.materiaid] = [];
      }
      acc[task.materiaid].push(task);
      return acc;
    }, {});

    const result = Object.keys(groupedByMateria).map((materiaId) => {
      const materiaTasks = groupedByMateria[materiaId];

      const monthsGroup = materiaTasks.reduce((acc, task) => {
        const month = new Date(task.fecha).getMonth() + 1;
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(task);
        return acc;
      }, {});

      const months = Object.keys(monthsGroup).map((month) => {
        const monthTasks = monthsGroup[month];

        // Group tasks by type
        const typeGroups = monthTasks.reduce((acc, task) => {
          if (!acc[task.tipo]) {
            acc[task.tipo] = [];
          }
          acc[task.tipo].push(task);
          return acc;
        }, {});

        // Calculate averages per type
        const typeAverages = Object.keys(typeGroups).map((type) => {
          const typeTasks = typeGroups[type];

          // Get unique student IDs across all tasks
          const studentIds = [
            ...new Set(
              typeTasks.flatMap((task) =>
                task.estudiantes.map((est) => est.estudianteId)
              )
            ),
          ];

          // Calculate one average per student from all their grades
          const studentGradeMap = {};

          // First collect all grades for each student
          typeTasks.forEach((task) => {
            task.estudiantes.forEach((student) => {
              if (!studentGradeMap[student.estudianteId]) {
                studentGradeMap[student.estudianteId] = [];
              }
              if (
                student.calificacion !== undefined &&
                student.calificacion !== 0
              ) {
                studentGradeMap[student.estudianteId].push(
                  student.calificacion
                );
              }
            });
          });

          // Then calculate averages
          const studentAverages = studentIds.map((studentId) => {
            const grades = studentGradeMap[studentId] || [];

            const average =
              grades.length > 0
                ? grades.reduce((a, b) => a + b, 0) / grades.length
                : 0;

            return {
              estudianteId: studentId,
              nombre: studentMap[studentId] || "Unknown",
              promedio: Number(average.toFixed(2)),
            };
          });

          // Then calculate averages - Add this after calculating averages
          const uniqueStudentAverages = Object.values(
            studentAverages.reduce((acc, student) => {
              acc[student.estudianteId] = student;
              return acc;
            }, {})
          );

          return {
            tipo: type,
            studentAverages: uniqueStudentAverages,
          };
        });

        return {
          month: parseInt(month),
          typeAverages: typeAverages,
        };
      });

      return {
        materiaid: materiaId,
        materiaName: materiaMap[materiaId] || "Unknown",
        months: months,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al obtener los promedios",
      error: error.message,
    };
  }
};

const getStudentsByCourse = async (cursoId) => {
  try {
    const students = await Inscripcion.find({
      curso: cursoId,
    });

    if (!students || students.length === 0) {
      return {
        success: false,
        message: "No se encontraron estudiantes para este curso",
      };
    }

    return {
      success: true,
      data: students,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al obtener los estudiantes",
      error: error.message,
    };
  }
};

module.exports = { generateExcelReport };
