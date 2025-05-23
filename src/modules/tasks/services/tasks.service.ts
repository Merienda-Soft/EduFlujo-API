import Database from '../../../shared/database/connection';
import { CreateTaskWithAssignmentsDto, TaskAssignmentDto, GradeTaskDto } from '../dtos/tasks.dto';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Readable } from 'stream';
import axios from 'axios';

// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export class TasksService {
    private db = Database.getInstance();
    private exportDir = path.join(process.cwd(), 'public', 'exports');

    constructor() {
        // Create exports directory if it doesn't exist
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    // Helper method to get Excel template from Firebase
    private async getExcelTemplate(): Promise<Buffer> {
        try {
            console.log('Intentando obtener la plantilla de Excel...');
            const templateRef = ref(storage, 'template_report/plantilla_registro_notas.xlsx');
            console.log('Obteniendo URL de descarga...');
            const url = await getDownloadURL(templateRef);
            console.log('URL de descarga obtenida:', url);
            
            // Download the file using axios
            console.log('Descargando archivo...');
            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            });
            console.log('Archivo descargado exitosamente');
            
            return Buffer.from(response.data);
        } catch (error) {
            console.error('Error detallado al obtener la plantilla Excel:', error);
            if (error.code === 'storage/object-not-found') {
                throw new Error('La plantilla de Excel no existe en Firebase Storage. Por favor, asegúrese de que el archivo template_report/plantilla_registro_notas.xlsx existe.');
            }
            throw new Error(`Error al obtener la plantilla de Excel: ${error.message}`);
        }
    }

    // Helper method to upload report to Firebase
    private async uploadReportToFirebase(buffer: Buffer | Uint8Array, fileName: string): Promise<string> {
        try {
            console.log(`Intentando subir archivo ${fileName} a Firebase...`);
            const fileRef = ref(storage, `reports/${fileName}`);
            console.log('Subiendo archivo...');
            await uploadBytes(fileRef, buffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            console.log('Archivo subido exitosamente');
            console.log('Obteniendo URL de descarga...');
            const url = await getDownloadURL(fileRef);
            console.log('URL de descarga obtenida:', url);
            return url;
        } catch (error) {
            console.error('Error detallado al subir reporte a Firebase:', error);
            throw new Error(`Error al subir reporte a Firebase: ${error.message}`);
        }
    }

    // Helper method to determine which quarter a task belongs to
    private getTaskQuarter(taskDate: Date, management: any): number | null {
        if (!taskDate) return null;
        
        if (management.first_quarter_start && management.first_quarter_end && 
            taskDate >= new Date(management.first_quarter_start) && 
            taskDate <= new Date(management.first_quarter_end)) {
            return 1;
        }
        if (management.second_quarter_start && management.second_quarter_end && 
            taskDate >= new Date(management.second_quarter_start) && 
            taskDate <= new Date(management.second_quarter_end)) {
            return 2;
        }
        if (management.third_quarter_start && management.third_quarter_end && 
            taskDate >= new Date(management.third_quarter_start) && 
            taskDate <= new Date(management.third_quarter_end)) {
            return 3;
        }
        return null;
    }

    // Helper method to convert quarter number to quarter key
    private getQuarterKey(quarter: number | null): string {
        switch (quarter) {
            case 1: return 'first_quarter';
            case 2: return 'second_quarter';
            case 3: return 'third_quarter';
            default: return 'other';
        }
    }

    async createTask(data: CreateTaskWithAssignmentsDto) {
        return await this.db.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    name: data.task.name,
                    description: data.task.description,
                    dimension_id: data.task.dimension_id,
                    management_id: data.task.management_id,
                    professor_id: data.task.professor_id,
                    subject_id: data.task.subject_id,
                    course_id: data.task.course_id,
                    weight: data.task.weight,
                    is_autoevaluation: data.task.is_autoevaluation || 0,
                    quarter: data.task.quarter,
                    type: data.task.type,
                    start_date: data.task.start_date,
                    end_date: data.task.end_date,
                    status: 1
                }
            });

            // Obtener estudiantes del curso
            const students = await tx.student.findMany({
                where: {
                    registrations: {
                        some: {
                            course_id: data.task.course_id,
                            management_id: data.task.management_id
                        }
                    }
                },
                include: {
                    person: true
                }
            });

            // Crear asignaciones y notificaciones en paralelo
            const assignmentPromises = students.map(student => 
                tx.taskAssignment.create({
                    data: {
                        task_id: task.id,
                        student_id: student.id,
                        status: 0
                    }
                })
            );

            const notificationPromises = students.map(student =>
                tx.notifications.create({
                    data: {
                        id_person_from: data.task.professor_id,
                        id_person_to: student.person.id,
                        message: `Nueva tarea: "${data.task.name}" en la materia ${data.task.subject_id} del curso ${data.task.course_id}. Fecha de entrega: ${new Date(data.task.end_date).toLocaleDateString()}`
                    }
                })
            );

            // Ejecutar todas las promesas en paralelo
            await Promise.all([...assignmentPromises, ...notificationPromises]);

            // Retornar la tarea creada con sus relaciones
            return await tx.task.findUnique({
                where: { id: task.id },
                include: {
                    dimension: true,
                    subject: true
                }
            });
        }, {
            timeout: 10000 // Aumentar el timeout a 10 segundos
        });
    }

    async getAllTasks() {
        return await this.db.task.findMany({
            where: {
                status: 1
            },
            include: {
                assignments: true,
                professor: {
                    include: { person: true }
                },
                subject: true,
                dimension: true
            }
        });
    }

    async getTaskById(id: number) {
        return await this.db.task.findUnique({
            where: { 
                id,
                status: 1
            },
            include: {
                assignments: {
                    include: {
                        student: {
                            include: {
                                person: {
                                    select: {
                                        name: true,
                                        lastname: true,
                                        second_lastname: true
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });
    }

    async updateTask(id: number, data: any) {
        return await this.db.task.update({
            where: { id },
            data: {
                ...data,
                last_update: new Date()
            },
            include: {
                assignments: true
            }
        });
    }

    async deleteTask(id: number) {
        return await this.db.task.update({
            where: { id },
            data: {
                status: 0,
                deleted_at: new Date(),
                last_update: new Date()
            }
        });
    }

    async gradeTask(taskId: number, data: GradeTaskDto) {
        return await this.db.$transaction(async (tx) => {
            const updatePromises = data.students.map(student =>
                tx.taskAssignment.update({
                    where: {
                        task_id_student_id: {
                            task_id: taskId,
                            student_id: student.student_id
                        }
                    },
                    data: {
                        qualification: student.qualification,
                        comment: student.comment,
                        status: 1
                    }
                })
            );

            const results = await Promise.all(updatePromises);
            return {
                ok: true,
                message: 'Calificaciones actualizadas exitosamente',
                updated: results.length
            };
        });
    }

    async getTasksByStudent(studentId: number, courseId: number, subjectId: number, managementId: number) {
        return await this.db.task.findMany({
            where: {
                status: 1,
                type: 0,
                course_id: courseId,
                subject_id: subjectId,
                management_id: managementId,
                assignments: {
                    some: {
                        student_id: studentId
                    }
                }
            },
            include: {
                assignments: {
                    where: {
                        student_id: studentId
                    }
                },
                subject: true,
                dimension: true,
                professor: {
                    include: {
                        person: true
                    }
                }
            }
        });
    }

    //get task by task id and student id
    async getTaskByIdAndStudentId(taskId: number, studentId: number) {
        return await this.db.task.findUnique({
            where: {
                id: taskId,
                status: 1
            },
            include: {
                assignments: {
                    where: {
                        student_id: studentId
                    }
                },
            }
        });
    }

    async getTasksByProfessorCourseSubjectManagement(professorId: number, courseId: number, subjectId: number, managementId: number) {
        console.log('Filtro de búsqueda:', {
            status: 1,
            professor_id: professorId,
            course_id: courseId,
            subject_id: subjectId,
            management_id: managementId
        });
        const result = await this.db.task.findMany({
            where: {
                status: 1,
                professor_id: professorId,
                course_id: courseId,
                subject_id: subjectId,
                management_id: managementId
            },
            include: {
                assignments: true,
                subject: true,
                dimension: true,
                professor: {
                    include: {
                        person: true
                    }
                }
            }
        });
        console.log('Resultado de la consulta:', result);
        return result;
    }

    async getTasksByCourseAndProfessor(courseId: number, professorId: number, managementId: number) {
        // Obtener la información del management para las fechas de los quarters
        const management = await this.db.management.findUnique({
            where: { id: managementId }
        });

        if (!management) {
            throw new Error('No se encontró la gestión especificada');
        }

        // Obtener todas las tareas con sus asignaciones y relaciones
        const tasks = await this.db.task.findMany({
            where: {
                status: 1,
                course_id: courseId,
                professor_id: professorId,
                management_id: managementId
            },
            include: {
                assignments: {
                    include: {
                        student: {
                            include: {
                                person: {
                                    select: {
                                        name: true,
                                        lastname: true,
                                        second_lastname: true
                                    }
                                }
                            }
                        }
                    }
                },
                subject: true,
                dimension: true,
                professor: {
                    include: {
                        person: true
                    }
                },
                course: true,
                management: true
            }
        });

        // Si no hay tareas, retornar estructura vacía
        if (tasks.length === 0) {
            return {
                first_quarter: {
                    students: {},
                    ser_decidir: {}
                },
                second_quarter: {
                    students: {},
                    ser_decidir: {}
                },
                third_quarter: {
                    students: {},
                    ser_decidir: {}
                }
            };
        }

        // Función para obtener el mes de una fecha
        const getMonthKey = (date: Date) => {
            return date.toLocaleString('es-ES', { month: 'long' });
        };

        // Nueva estructura para organizar las notas
        const result = {
            first_quarter: {
                students: {},
                ser_decidir: {}
            },
            second_quarter: {
                students: {},
                ser_decidir: {}
            },
            third_quarter: {
                students: {},
                ser_decidir: {}
            }
        };

        // Procesar cada tarea y sus asignaciones
        tasks.forEach(task => {
            const quarterNum = this.getTaskQuarter(task.start_date, management);
            const quarter = this.getQuarterKey(quarterNum);
            const month = getMonthKey(task.start_date);
            const dimensionId = task.dimension.id;

            task.assignments.forEach(assignment => {
                const studentId = assignment.student.id;
                const studentName = `${assignment.student.person.lastname} ${assignment.student.person.second_lastname || ''} ${assignment.student.person.name}`.trim();
                const subjectId = task.subject.id;
                const subjectName = task.subject.subject;

                // Procesar SER, DECIDIR y AUTOEVALUACIÓN a nivel de curso/trimestre
                if (dimensionId === 1 || dimensionId === 4 || dimensionId === 5) {
                    if (!result[quarter].ser_decidir[studentId]) {
                        result[quarter].ser_decidir[studentId] = {
                            studentName,
                            dimensions: {
                                1: { weight: 5, tasks: [], average: null },  // SER
                                4: { weight: 5, tasks: [], average: null },  // DECIDIR
                                5: { weight: 5, tasks: [], average: null }   // AUTOEVALUACIÓN
                            }
                        };
                    }

                    if (assignment.qualification !== null && assignment.qualification !== undefined) {
                        const qualification = parseFloat(assignment.qualification.toString().trim());
                        if (!isNaN(qualification)) {
                            result[quarter].ser_decidir[studentId].dimensions[dimensionId].tasks.push({
                                taskId: task.id,
                                taskName: task.name,
                                qualification: qualification,
                                weight: 5
                            });

                            // Recalcular promedio con el peso correspondiente (5%)
                            const tasks = result[quarter].ser_decidir[studentId].dimensions[dimensionId].tasks;
                            if (tasks.length > 0) {
                                const sum = tasks.reduce((acc, t) => acc + t.qualification, 0);
                                const rawAverage = sum / tasks.length;
                                // El promedio ya está sobre 100, multiplicamos por el peso (5%)
                                result[quarter].ser_decidir[studentId].dimensions[dimensionId].average = Number((rawAverage * 0.05).toFixed(2));
                            }
                        }
                    }
                } else { // SABER y HACER
                    // Inicializar la estructura si no existe
                    if (!result[quarter].students[studentId]) {
                        result[quarter].students[studentId] = {
                            studentName,
                            subjects: {}
                        };
                    }

                    if (!result[quarter].students[studentId].subjects[subjectId]) {
                        result[quarter].students[studentId].subjects[subjectId] = {
                            subjectName,
                            months: {}
                        };
                    }

                    if (!result[quarter].students[studentId].subjects[subjectId].months[month]) {
                        result[quarter].students[studentId].subjects[subjectId].months[month] = {
                            dimensions: {
                                2: { weight: 45, tasks: [], average: null }, // SABER
                                3: { weight: 40, tasks: [], average: null }  // HACER
                            }
                        };
                    }

                    // Agregar la calificación a la dimensión correspondiente
                    if (assignment.qualification !== null && assignment.qualification !== undefined) {
                        const qualification = parseFloat(assignment.qualification.toString().trim());
                        if (!isNaN(qualification)) {
                            const dimension = result[quarter].students[studentId].subjects[subjectId].months[month].dimensions[dimensionId];
                            dimension.tasks.push({
                                taskId: task.id,
                                taskName: task.name,
                                qualification: qualification,
                                weight: dimension.weight
                            });

                            // Recalcular promedio con el peso correspondiente
                            if (dimension.tasks.length > 0) {
                                const sum = dimension.tasks.reduce((acc, t) => acc + t.qualification, 0);
                                const rawAverage = sum / dimension.tasks.length;
                                // El promedio ya está sobre 100, multiplicamos por el peso (45% para SABER, 40% para HACER)
                                const weightMultiplier = dimensionId === 2 ? 0.45 : 0.40; // SABER = 45%, HACER = 40%
                                dimension.average = Number((rawAverage * weightMultiplier).toFixed(2));
                            }
                        }
                    }
                }
            });
        });

        // Generate Excel files and return URLs
        const reportUrls = await this.generateQuarterlyExcelFiles(courseId, professorId, result);

        return {
            data: result,
            reports: reportUrls
        };
    }

    private roundGrade(grade: number): number {
        if (grade === null || grade === undefined || isNaN(grade)) {
            return 0;
        }
        // Redondear a 2 decimales primero
        const roundedToTwoDecimals = Number((Math.round(grade * 100) / 100).toFixed(2));
        // Luego redondear al entero más cercano si es necesario
        return Math.round(roundedToTwoDecimals);
    }

    // Subject name mapping configuration
    private subjectMapping = {
        'LENGUAJE': 'LENG',
        'CIENCIAS SOCIALES': 'CIEN SOC',
        'EDUCACIÓN FÍSICA Y DEPORTES': 'ED FISICA',
        'EDUCACIÓN MUSICAL': 'ED MUSICA',
        'ARTES PLÁSTICAS Y VISUALES': 'ARTES PL',
        'MATEMÁTICAS': 'MATE',
        'TÉCNICA TECNOLÓGICA': 'TECN TECN',
        'CIENCIAS NATURALES': 'CIEN NAT',
        'VALORES, ESPIRITUALIDAD Y RELIGIONES': 'RELIGION'
    };

    // Column configuration for each subject worksheet
    private columnConfig = {
        'LENG': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['L', 'M', 'N', 'O', 'P', 'Q']
        },
        'CIEN SOC': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'ED FISICA': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'ED MUSICA': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'ARTES PL': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'MATE': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['K', 'L', 'M', 'N', 'O']
        },
        'TECN TECN': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'CIEN NAT': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        },
        'RELIGION': {
            saber: ['D', 'E', 'F', 'G', 'H'],
            hacer: ['J', 'K', 'L', 'M', 'N']
        }
    };

    // Columnas disponibles para SER y DECIDIR por trimestre
    private serDecidirColumns = {
        ser: {
            1: 'C',  // primer trimestre
            2: 'D',  // segundo trimestre
            3: 'E'   // tercer trimestre
        },
        decidir: {
            1: 'I',  // primer trimestre
            2: 'J',  // segundo trimestre
            3: 'K'   // tercer trimestre
        }
    };

    // Columna para autoevaluación (siempre es C)
    private autoevaluacionColumn = 'C';

    // Helper function to find the most similar subject name
    private findMatchingSubject(subjectName: string): string | null {
        const normalizedInput = subjectName.toUpperCase().trim();
        
        // Direct match check
        for (const [dbName, excelName] of Object.entries(this.subjectMapping)) {
            if (normalizedInput === dbName) {
                return excelName;
            }
        }

        // Similarity check
        let bestMatch = null;
        let highestSimilarity = 0;

        for (const [dbName, excelName] of Object.entries(this.subjectMapping)) {
            const similarity = this.calculateSimilarity(normalizedInput, dbName);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = excelName;
            }
        }

        // Only return a match if similarity is above threshold
        return highestSimilarity > 0.7 ? bestMatch : null;
    }

    // Simple similarity calculation using Levenshtein distance
    private calculateSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return 1 - distance / maxLength;
    }

    async generateQuarterlyExcelFiles(courseId: number, professorId: number, processedData: any) {
        try {
            console.log('Iniciando generación de archivos Excel...');
            const course = await this.db.course.findUnique({ where: { id: courseId } });
            const courseName = course?.course ? course.course.replace(/\s+/g, '_') : 'curso';
            const dateStr = new Date().getFullYear();

            console.log('Obteniendo plantilla Excel...');
            // Get template from Firebase
            const templateBuffer = await this.getExcelTemplate();
            console.log('Plantilla obtenida exitosamente');

            // Create the files for each quarter
            const quarterFiles = [1, 2, 3].map(quarter => {
                const quarterFileName = `registro_notas_${courseName}_${dateStr}_prof${professorId}_trimestre${quarter}.xlsx`;
                return {
                    quarter,
                    fileName: quarterFileName,
                    workbook: new ExcelJS.Workbook()
                };
            });

            console.log('Cargando workbooks desde la plantilla...');
            // Load all workbooks from template
            await Promise.all(quarterFiles.map(async qf => {
                const stream = new Readable();
                stream.push(templateBuffer);
                stream.push(null);
                await qf.workbook.xlsx.read(stream);
            }));
            console.log('Workbooks cargados exitosamente');

            // Obtener los estudiantes del curso con su información personal
            const registrations = await this.db.registration.findMany({
                where: { course_id: courseId },
                include: {
                    student: {
                        include: {
                            person: true
                        }
                    }
                },
                orderBy: {
                    student: {
                        person: {
                            lastname: 'asc'
                        }
                    }
                }
            });

            // Mapear los quarters a sus claves correspondientes
            const quarterMap = {
                1: 'first_quarter',
                2: 'second_quarter',
                3: 'third_quarter'
            };

            // Procesar cada archivo trimestral
            for (const quarterFile of quarterFiles) {
                const filiacionSheet = quarterFile.workbook.getWorksheet('FILIACIÓN');
                const evalSheet = quarterFile.workbook.getWorksheet('EVAL SER Y DECIDIR');
                const autoEvalSheet = quarterFile.workbook.getWorksheet('AUTOEVALUACIÓN');
                
                if (!filiacionSheet || !evalSheet || !autoEvalSheet) {
                    throw new Error(`Hojas requeridas no encontradas en el archivo del trimestre ${quarterFile.quarter}`);
                }

                // Llenar datos de FILIACIÓN
                let row = 8;
                for (const reg of registrations) {
                    const p = reg.student.person;
                    const fullName = [p.lastname, p.second_lastname, p.name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
                    const nameParts = fullName.split(' ');
                    let apPaterno = '', apMaterno = '', nombres = '';
                    
                    if (nameParts.length >= 3) {
                        apPaterno = nameParts[0];
                        apMaterno = nameParts[1];
                        nombres = nameParts.slice(2).join(' ');
                    } else if (nameParts.length === 2) {
                        apPaterno = nameParts[0];
                        nombres = nameParts[1];
                    } else {
                        nombres = nameParts[0] || '';
                    }

                    // Escribir datos de filiación
                    filiacionSheet.getCell(`B${row}`).value = apPaterno;
                    filiacionSheet.getCell(`C${row}`).value = apMaterno;
                    filiacionSheet.getCell(`D${row}`).value = nombres;
                    filiacionSheet.getCell(`E${row}`).value = reg.student.rude || '';
                    filiacionSheet.getCell(`F${row}`).value = p.ci || '';
                    if (p.birth_date) {
                        const birthDate = new Date(p.birth_date);
                        filiacionSheet.getCell(`G${row}`).value = birthDate.getDate().toString().padStart(2, '0');
                        filiacionSheet.getCell(`H${row}`).value = (birthDate.getMonth() + 1).toString().padStart(2, '0');
                        filiacionSheet.getCell(`I${row}`).value = birthDate.getFullYear().toString();
                    }
                    filiacionSheet.getCell(`K${row}`).value = p.gender || '';

                    // Obtener datos del estudiante para este trimestre
                    const quarterKey = quarterMap[quarterFile.quarter];
                    const quarterData = processedData[quarterKey];

                    if (quarterData && quarterData.ser_decidir && quarterData.ser_decidir[reg.student.id]) {
                        // Pintar SER
                        const serData = quarterData.ser_decidir[reg.student.id].dimensions[1];
                        if (serData?.average !== null && serData?.average !== undefined) {
                            const serColumn = this.serDecidirColumns.ser[quarterFile.quarter];
                            const roundedSerGrade = this.roundGrade(serData.average);
                            console.log(`Pintando SER para estudiante ${reg.student.id}: ${serData.average} -> ${roundedSerGrade}`);
                            evalSheet.getCell(`${serColumn}${row}`).value = roundedSerGrade;
                        }

                        // Pintar DECIDIR
                        const decidirData = quarterData.ser_decidir[reg.student.id].dimensions[4];
                        if (decidirData?.average !== null && decidirData?.average !== undefined) {
                            const decidirColumn = this.serDecidirColumns.decidir[quarterFile.quarter];
                            const roundedDecidirGrade = this.roundGrade(decidirData.average);
                            console.log(`Pintando DECIDIR para estudiante ${reg.student.id}: ${decidirData.average} -> ${roundedDecidirGrade}`);
                            evalSheet.getCell(`${decidirColumn}${row}`).value = roundedDecidirGrade;
                        }

                        // Pintar AUTOEVALUACIÓN
                        const autoEvalData = quarterData.ser_decidir[reg.student.id].dimensions[5];
                        if (autoEvalData?.average !== null && autoEvalData?.average !== undefined) {
                            const roundedAutoEvalGrade = this.roundGrade(autoEvalData.average);
                            console.log(`Pintando AUTOEVALUACIÓN para estudiante ${reg.student.id}: ${autoEvalData.average} -> ${roundedAutoEvalGrade}`);
                            autoEvalSheet.getCell(`${this.autoevaluacionColumn}${row}`).value = roundedAutoEvalGrade;
                        }
                    }

                    // Pintar SABER y HACER por materia
                    if (quarterData && quarterData.students && quarterData.students[reg.student.id]) {
                        const studentData = quarterData.students[reg.student.id];
                        if (studentData.subjects) {
                            Object.entries(studentData.subjects).forEach(([_, subject]: [string, any]) => {
                                const excelSheetName = this.findMatchingSubject(subject.subjectName);
                                if (!excelSheetName) {
                                    console.log(`No se encontró coincidencia para la materia: ${subject.subjectName}`);
                                    return;
                                }

                                const subjectSheet = quarterFile.workbook.getWorksheet(excelSheetName);
                                if (!subjectSheet) {
                                    console.log(`No se encontró la hoja para la materia: ${excelSheetName}`);
                                    return;
                                }

                                const columns = this.columnConfig[excelSheetName];
                                if (!columns) {
                                    console.log(`No se encontró configuración de columnas para: ${excelSheetName}`);
                                    return;
                                }

                                let saberColumnIndex = 0;
                                let hacerColumnIndex = 0;

                                // Ordenar los meses para asegurar que se pinten en orden
                                const sortedMonths = Object.entries(subject.months).sort((a, b) => {
                                    const monthOrder = {
                                        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
                                        'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
                                        'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
                                    };
                                    return monthOrder[a[0]] - monthOrder[b[0]];
                                });

                                sortedMonths.forEach(([month, monthData]: [string, any]) => {
                                    // Pintar promedio SABER
                                    if (monthData.dimensions[2]?.average !== null && monthData.dimensions[2]?.average !== undefined && saberColumnIndex < columns.saber.length) {
                                        const saberColumn = columns.saber[saberColumnIndex];
                                        const roundedSaberGrade = this.roundGrade(monthData.dimensions[2].average);
                                        console.log(`Pintando SABER para estudiante ${reg.student.id} en ${subject.subjectName} - ${month}: ${monthData.dimensions[2].average} -> ${roundedSaberGrade}`);
                                        subjectSheet.getCell(`${saberColumn}${row}`).value = roundedSaberGrade;
                                        saberColumnIndex++;
                                    }

                                    // Pintar promedio HACER
                                    if (monthData.dimensions[3]?.average !== null && monthData.dimensions[3]?.average !== undefined && hacerColumnIndex < columns.hacer.length) {
                                        const hacerColumn = columns.hacer[hacerColumnIndex];
                                        const roundedHacerGrade = this.roundGrade(monthData.dimensions[3].average);
                                        console.log(`Pintando HACER para estudiante ${reg.student.id} en ${subject.subjectName} - ${month}: ${monthData.dimensions[3].average} -> ${roundedHacerGrade}`);
                                        subjectSheet.getCell(`${hacerColumn}${row}`).value = roundedHacerGrade;
                                        hacerColumnIndex++;
                                    }
                                });
                            });
                        }
                    }

                    row++;
                }
            }

            console.log('Guardando archivos en Firebase...');
            // Save all files to Firebase and return URLs directly
            const reportUrls = await Promise.all(quarterFiles.map(async qf => {
                const buffer = await qf.workbook.xlsx.writeBuffer();
                const url = await this.uploadReportToFirebase(new Uint8Array(buffer), qf.fileName);
                return {
                    quarter: qf.quarter,
                    fileName: qf.fileName,
                    url: url
                };
            }));
            console.log('Archivos guardados exitosamente');

            return reportUrls;
        } catch (error) {
            console.error('Error detallado en generateQuarterlyExcelFiles:', error);
            throw new Error(`Error al generar los archivos Excel: ${error.message}`);
        }
    }

    async getTaskByIdWithAssignments(taskId: number, studentId: number) {
        return await this.db.task.findUnique({
            where: {
                id: taskId,
                status: 1
            },
            include: {
                assignments: {
                    where: {
                        student_id: studentId
                    }
                },
            }
        });
    }

    async submitTaskFiles(taskId: number, studentId: number, files: { name: string; url: string }[]) {
        return await this.db.$transaction(async (tx) => {
            // Verificar que la tarea existe y está activa
            const task = await tx.task.findUnique({
                where: {
                    id: taskId,
                    status: 1
                }
            });

            if (!task) {
                throw new Error('Tarea no encontrada o inactiva');
            }

            // Verificar que el estudiante tiene asignada la tarea
            const assignment = await tx.taskAssignment.findUnique({
                where: {
                    task_id_student_id: {
                        task_id: taskId,
                        student_id: studentId
                    }
                }
            });

            if (!assignment) {
                throw new Error('El estudiante no tiene asignada esta tarea');
            }

            // Actualizar el assignment con los archivos y marcar como entregado
            const updatedAssignment = await tx.taskAssignment.update({
                where: {
                    task_id_student_id: {
                        task_id: taskId,
                        student_id: studentId
                    }
                },
                data: {
                    files: files,
                    status: 1,
                    submitted_at: new Date(),
                    last_update: new Date(),
                    completed_date: new Date()
                }
            });

            return updatedAssignment;
        });
    }

    async cancelSubmitTaskFiles(taskId: number, studentId: number) {
        return await this.db.$transaction(async (tx) => {
            // Verificar que la tarea existe y está activa
            const task = await tx.task.findUnique({
                where: {
                    id: taskId,
                    status: 1
                }
            });

            if (!task) {
                throw new Error('Tarea no encontrada o inactiva');
            }

            // Verificar que el estudiante tiene asignada la tarea
            const assignment = await tx.taskAssignment.findUnique({
                where: {
                    task_id_student_id: {
                        task_id: taskId,
                        student_id: studentId
                    }
                }
            });

            if (!assignment) {
                throw new Error('El estudiante no tiene asignada esta tarea');
            }

            // Revertir el estado de la entrega
            const updatedAssignment = await tx.taskAssignment.update({
                where: {
                    task_id_student_id: {
                        task_id: taskId,
                        student_id: studentId
                    }
                },
                data: {
                    files: null,
                    status: 0, // Cambiar el estado a no entregado
                    submitted_at: null,
                    last_update: new Date(),
                    completed_date: null
                }
            });

            return updatedAssignment;
        });
    }

    async exportStudentsToExcel(courseId: number, professorId: number, managementId: number) {
        // Este método ya no es necesario, pero lo mantenemos por compatibilidad
        // retornando una estructura vacía
        return {
            ok: true,
            files: []
        };
    }

    async getCourseById(id: number) {
        return await this.db.course.findUnique({
            where: { id }
        });
    }
}