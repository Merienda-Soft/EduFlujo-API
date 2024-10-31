const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

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
        return res.status(500).json({ ok: false, error: 'Error al generar el reporte' });
    }
}

module.exports = { generateExcelReport };
