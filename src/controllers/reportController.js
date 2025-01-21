const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const Actividad = require("../models/activity");

// Ruta de la plantilla
const templatePath = path.join(__dirname, '..', 'templates', '_PRIMARIA REGISTRO_1_TRIMESTRE.xlsx');

const generateExcelReport = async (req, res) => {
    try {
        // Cargar la plantilla
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        // Seleccionar la hoja específica
        const worksheet = workbook.getWorksheet('LENG');
        if (!worksheet) {
            return res.status(400).json({ ok: false, error: 'La hoja especificada no se encuentra' });
        }

        const tareasName = [
            {tarea1: 'Control de lectura', tarea2: 'Esta es task2', tarea3: 'esto es task3'},
            {tarea1: 'Control de escritura', tarea2: 'Esta es task2', tarea3: 'esto es task3'},
            {tarea1: 'Control de memoria', tarea2: 'Esta es task2', tarea3: 'esto es task3'},
        ]

        // Datos de estudiantes
        const estudiantes = [
            { nota1: 85, nota2: 65, nota3: 15},
            { nota1: 90, nota2: 90, nota3: 100},
            { nota1: 10, nota3: 100, nota3: 25},
        ];

        // Insertar datos sin perder el formato
        tareasName.forEach((task) => {
            const row = worksheet.getRow(7);
            row.getCell(4).value = task.tarea1;
            row.getCell(5).value = task.tarea2; 
            row.getCell(6).value = task.tarea3;
            row.commit();
        })

        let startRow = 8;
        estudiantes.forEach((est, index) => {
            const row = worksheet.getRow(startRow + index);
            row.getCell(4).value = est.nota1; 
            row.getCell(5).value = est.nota2;
            row.getCell(6).value = est.nota3; 
            row.commit();
        });

        // Generar archivo en la carpeta temp
        const outputFilePath = path.join(__dirname, '..', 'temp', `reporte_notas_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(outputFilePath);

        // Verificar si el archivo se creó correctamente
        if (fs.existsSync(outputFilePath)) {
            return res.status(200).json({ ok: true, filePath: outputFilePath });
        } else {
            return res.status(500).json({ ok: false, error: 'No se pudo crear el archivo' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error, msg: 'Error al generar el reporte' });
    }
}

const getTasksFrom = async (req, res) => {
    try {
        const tasks = await Actividad.find({ professorid: req.params.id });

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
                
                // Get all unique student IDs for this month
                const studentIds = [...new Set(
                    monthTasks.flatMap(task => 
                        task.estudiantes.map(est => est.estudianteId)
                    )
                )];

                // Calculate average per student
                const studentAverages = studentIds.map(studentId => {
                    const studentGrades = monthTasks
                        .map(task => {
                            const studentTask = task.estudiantes
                                .find(est => est.estudianteId === studentId);
                            return studentTask ? studentTask.calificacion : 0;
                        })
                        .filter(grade => grade !== undefined);

                    const average = studentGrades.length > 0 
                        ? studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length 
                        : 0;

                    return {
                        estudianteId: studentId,
                        promedio: Number(average.toFixed(2))
                    };
                });

                return {
                    month: parseInt(month),
                    tasks: monthTasks,
                    studentAverages: studentAverages
                };
            });

            return {
                materiaid: materiaId,
                months: months
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener las tareas",
            error: error.message
        });
    }
};


module.exports = { generateExcelReport, getTasksFrom };
