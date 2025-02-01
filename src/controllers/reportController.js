const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const Actividad = require("../models/activity");
const Registration = require('../models/registration');
const Materia = require('../models/subject');

// Ruta de la plantilla
const templatePath = path.join(__dirname, '..', 'templates', '_PRIMARIA REGISTRO_1_TRIMESTRE.xlsx');


let colum = {
    "2": {
      "2": "D",
      "3": "J"
    },
    "3": {
      "2": "E",
      "3": "K"
    },
    "4": {
      "2": "F",
      "3": "L"
    },
    "5": {
      "2": "D",
      "3": "J"
    },
    "6": {
      "2": "E",
      "3": "K"
    },
    "8": {
      "2": "F",
      "3": "L"
    },
    "9": {
      "2": "D",
      "3": "J"
    },
    "10": {
      "2": "E",
      "3": "K"
    },
    "11": {
      "2": "F",
      "3": "L"
    }
  }

let estudensSheet = []

const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toString()
        .replace(/\n/g, ' ')           // replace line breaks with space
        .replace(/[\r@#&*()]/g, '')    // remove special chars
        .replace(/\s+/g, ' ')          // collapse multiple spaces into one
        .toLowerCase()
        .trim();
};

const getFila = (nombre) => {
    let file = estudensSheet.find(est => {
        const normalizedEst = normalizeText(est.text);
        const normalizedNombre = normalizeText(nombre);
        return normalizedEst === normalizedNombre;
    });
    return file;
};

// Add Date.year() helper
Date.year = function() {
    return new Date().getFullYear();
};

const generateExcelReport = async (req, res) => {
    try {
        const { professorId, cursoId } = req.query;

        if (!professorId || !cursoId) {
            return res.status(400).json({
                ok: false,
                msg: 'Se requieren professorId y cursoId'
            });
        }

        const result = await getTasksFrom(professorId, cursoId);
        
        // Define trimesters
        const TRIMESTER_MONTHS = {
            1: [2, 3, 4],
            2: [5, 6, 8],
            3: [9, 10, 11]
        };

        // Map materias to worksheet names
        const SHEET_NAMES = {
            'Lenguaje': 'LENG',
            'Ciencias Sociales': 'CIEN SOC',
            'Educación Física': 'ED FISICA',
            'Educación Musical': 'ED MUSICA',
            'Artes Plásticas': 'ARTES PL',
            'Matemática': 'MATE',
            'Técnica y Tecnológia': 'TECN TECN',
            'Ciencias Naturales': 'CIEN NAT',
            'Religión': 'RELIGION'
            // Add other mappings
        };

        // Group data by trimester
        const trimesterData = result.data.reduce((acc, materia) => {
            materia.months.forEach(month => {
                for (const [trimester, months] of Object.entries(TRIMESTER_MONTHS)) {
                    if (months.includes(month.month)) {
                        if (!acc[trimester]) acc[trimester] = [];
                        acc[trimester].push({ materia, month });
                    }
                }
            });
            return acc;
        }, {});

        // Generate report for each trimester
        for (const [trimester, data] of Object.entries(trimesterData)) {
            // Create new workbook from template
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(templatePath);

            // Process each materia
            data.forEach(({ materia, month }) => {
                const sheetName = SHEET_NAMES[materia.materiaName];
                if (!sheetName) return;

                const worksheet = workbook.getWorksheet(sheetName);
                if (!worksheet) return;

                // Read student names
                estudensSheet = [];
                let row = 8;
                while (row < 35) {
                    const cell = worksheet.getCell(`B${row}`);
                    if (!cell || !cell.value) break;
                    estudensSheet.push({
                        id: row,
                        text: cell.text
                    });
                    row++;
                }

                // Write grades
                month.typeAverages.forEach(type => {
                    const column = colum[month.month][type.tipo];
                    type.studentAverages.forEach(student => {
                        const fila = getFila(student.nombre);
                        if (fila && column) {
                            const cell = worksheet.getCell(`${column}${fila.id}`);
                            // Convert grade based on type (2 or 3)
                            const maxPoints = type.tipo === "2" ? 45 : 40;
                            const convertedGrade = Math.round((student.promedio * maxPoints) / 100);
                            cell.value = convertedGrade;
                        }
                    });
                });
            });

            // Save trimester report with standard naming
            const tempPath = path.join(
                __dirname, 
                '..', 
                'temp', 
                `trimestre_${trimester}_${cursoId}_${Date.year()}.xlsx`
            );
            
            await workbook.xlsx.writeFile(tempPath);
        }

        return res.status(200).json({
            ok: true,
            msg: 'Reportes generados correctamente'
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).json({
            ok: false,
            error: error.message,
            msg: 'Error al generar el reporte'
        });
    }
};

const getTasksFrom = async (professorId, cursoId) => {
    try {
        const tasks = await Actividad.find({ professorid: professorId, cursoid: cursoId});

        // Get all registrations and materias for lookup
        const [registrations, materias] = await Promise.all([
            Registration.find(),
            Materia.find()
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

        const result = Object.keys(groupedByMateria).map(materiaId => {
            const materiaTasks = groupedByMateria[materiaId];

            const monthsGroup = materiaTasks.reduce((acc, task) => {
                const month = new Date(task.fecha).getMonth() + 1;
                if (!acc[month]) {
                    acc[month] = [];
                }
                acc[month].push(task);
                return acc;
            }, {});

            const months = Object.keys(monthsGroup).map(month => {
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
                const typeAverages = Object.keys(typeGroups).map(type => {
                    const typeTasks = typeGroups[type];

                    // Get unique student IDs across all tasks
                    const studentIds = [...new Set(
                        typeTasks.flatMap(task =>
                            task.estudiantes.map(est => est.estudianteId)
                        )
                    )];

                    // Calculate one average per student from all their grades
                    const studentGradeMap = {};

                    // First collect all grades for each student
                    typeTasks.forEach(task => {
                        task.estudiantes.forEach(student => {
                            if (!studentGradeMap[student.estudianteId]) {
                                studentGradeMap[student.estudianteId] = [];
                            }
                            if (student.calificacion !== undefined && student.calificacion !== 0) {
                                studentGradeMap[student.estudianteId].push(student.calificacion);
                            }
                        });
                    });

                    // Then calculate averages
                    const studentAverages = studentIds.map(studentId => {
                        const grades = studentGradeMap[studentId] || [];

                        const average = grades.length > 0
                            ? grades.reduce((a, b) => a + b, 0) / grades.length
                            : 0;

                        return {
                            estudianteId: studentId,
                            nombre: studentMap[studentId] || 'Unknown',
                            promedio: Number(average.toFixed(2))
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
                        studentAverages: uniqueStudentAverages
                    };
                });

                return {
                    month: parseInt(month),
                    typeAverages: typeAverages
                };
            });

            return {
                materiaid: materiaId,
                materiaName: materiaMap[materiaId] || 'Unknown',
                months: months
            };
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            message: "Error al obtener los promedios",
            error: error.message
        }
    }
};


module.exports = { generateExcelReport };
