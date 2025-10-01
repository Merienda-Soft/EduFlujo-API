import { PrismaClient } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import axios from "axios";
import { Readable } from "stream";

export class LibroPedagogicoService {
  private db: PrismaClient;
  private storage: any;

  constructor() {
    this.db = new PrismaClient();
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };

    const app = initializeApp(firebaseConfig);
    this.storage = getStorage(app);
  }

  // Helper method to get Excel template from Firebase
  private async getLibroPedagogicoTemplate(): Promise<Buffer> {
    try {
      console.log('Intentando obtener la plantilla del Libro Pedagógico...');
      const templateRef = ref(this.storage, 'template_report/Libro_pedagogico.xlsx');
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
      console.error('Error detallado al obtener la plantilla del Libro Pedagógico:', error);
      if (error.code === 'storage/object-not-found') {
        throw new Error('La plantilla del Libro Pedagógico no existe en Firebase Storage. Por favor, asegúrese de que el archivo template_report/Libro_pedagogico.xlsx existe.');
      }
      throw new Error(`Error al obtener la plantilla del Libro Pedagógico: ${error.message}`);
    }
  }

  // Helper method to upload report to Firebase
  private async uploadLibroPedagogicoToFirebase(buffer: Buffer | Uint8Array, fileName: string): Promise<string> {
    try {
      const fileRef = ref(this.storage, `reports/${fileName}`);
      await uploadBytes(fileRef, buffer);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error('Error al subir el Libro Pedagógico a Firebase:', error);
      throw new Error(`Error al subir el archivo: ${error.message}`);
    }
  }

  // Subject name mapping configuration
  private subjectMapping = {
    'COMUNICACIÓN Y LENGUAJES': 'LENG',
    'CIENCIAS SOCIALES': 'CIEN SOC',
    'EDUCACIÓN FÍSICA Y DEPORTES': 'ED FISICA',
    'EDUCACIÓN MUSICAL': 'ED MUSICA',
    'ARTES PLÁSTICAS Y VISUALES': 'ARTES PL',
    'MATEMÁTICAS': 'MATE',
    'TÉCNICA TECNOLÓGICA': 'TECN TECN',
    'CIENCIAS NATURALES': 'CIEN NAT',
    'VALORES ESPIRITUALIDADES Y RELIGIONES': 'RELIGION'
  };

  // Column configuration for each subject worksheet
  private columnConfig = {
    'LENG': {
      saber: ['D', 'E', 'F', 'G', 'H', 'I', 'J'],
      hacer: ['L', 'M', 'N', 'O', 'P', 'Q', 'R']
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
      saber: ['D', 'E', 'F', 'G', 'H', 'I'],
      hacer: ['K', 'L', 'M', 'N', 'O', 'P']
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

  // Columnas para SER y DECIDIR en la hoja "EVAL SER Y DECIDIR"
  private serDecidirColumns = {
    ser: ['C', 'D', 'E', 'F', 'G'],
    decidir: ['I', 'J', 'K', 'L', 'M']
  };

  // Columna para autoevaluación (siempre es C)
  private autoevaluacionColumn = 'C';

  // Helper method to get dimension scores (equivalent to reports.service.ts)
  private getDimensionScores() {
    return {
      1: 5,   // SER
      2: 45,  // SABER
      3: 40,  // HACER
      4: 5,   // DECIDIR
      5: 5    // AUTOEVALUACIÓN
    };
  }

  // Helper method to calculate equivalent score for a dimension
  private calculateEquivalentScore(qualification: number, dimensionId: number): number {
    const dimensionScores = this.getDimensionScores();
    const maxScore = dimensionScores[dimensionId];

    if (!maxScore || qualification === null || qualification === undefined) {
      return 0;
    }

    // Convert qualification (0-100) to equivalent score (0-maxScore)
    const equivalentScore = (qualification * maxScore) / 100;
    return Math.round(equivalentScore);
  }

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

  // Helper method to get month date range (sistema pedagógico boliviano)
  private getMonthDateRange(year: number, month: number, management: any): { startDate: Date, endDate: Date } {
    let monthStartDate: Date;
    let monthEndDate: Date;

    switch (month) {
      case 2: // Febrero (inicio del año escolar)
        monthStartDate = new Date(year, 1, 1); // 01 de febrero
        monthEndDate = new Date(year, 1, 28); // 28 de febrero (o 29 en bisiesto)
        break;
      case 3: // Marzo
        monthStartDate = new Date(year, 2, 1); // 01 de marzo
        monthEndDate = new Date(year, 2, 31); // 31 de marzo
        break;
      case 4: // Abril
        monthStartDate = new Date(year, 3, 1); // 01 de abril
        monthEndDate = new Date(year, 3, 30); // 30 de abril
        break;
      case 5: // Mayo
        monthStartDate = new Date(year, 4, 1); // 01 de mayo
        monthEndDate = new Date(year, 4, 31); // 31 de mayo
        break;
      case 6: // Junio (junto con julio)
        monthStartDate = new Date(year, 5, 1); // 01 de junio
        monthEndDate = new Date(year, 6, 31); // 31 de julio
        break;
      case 7: // Julio (junto con junio)
        monthStartDate = new Date(year, 5, 1); // 01 de junio
        monthEndDate = new Date(year, 6, 31); // 31 de julio
        break;
      case 8: // Agosto
        monthStartDate = new Date(year, 7, 1); // 01 de agosto
        monthEndDate = new Date(year, 7, 31); // 31 de agosto
        break;
      case 9: // Septiembre
        monthStartDate = new Date(year, 8, 1); // 01 de septiembre
        monthEndDate = new Date(year, 8, 30); // 30 de septiembre
        break;
      case 10: // Octubre
        monthStartDate = new Date(year, 9, 1); // 01 de octubre
        monthEndDate = new Date(year, 9, 31); // 31 de octubre
        break;
      case 11: // Noviembre
        monthStartDate = new Date(year, 10, 1); // 01 de noviembre
        monthEndDate = new Date(year, 10, 30); // 30 de noviembre
        break;
      case 12: // Diciembre
        monthStartDate = new Date(year, 11, 1); // 01 de diciembre
        monthEndDate = new Date(year, 11, 31); // 31 de diciembre
        break;
      default:
        throw new Error(`Mes no válido: ${month}. El año escolar inicia en febrero.`);
    }

    return { startDate: monthStartDate, endDate: monthEndDate };
  }

  // Helper method to get quarter date range (sistema pedagógico boliviano)
  private getQuarterDateRange(year: number, month: number, management: any): { startDate: Date, endDate: Date } {
    let quarterStartDate: Date;
    let quarterEndDate: Date;

    // Determinar trimestre basado en el mes
    if (month >= 2 && month <= 4) { // Trimestre 1: Febrero-Abril
      quarterStartDate = new Date(year, 1, 1); // 01 de febrero
      quarterEndDate = new Date(year, 3, 30); // 30 de abril
    } else if (month >= 5 && month <= 7) { // Trimestre 2: Mayo-Julio
      quarterStartDate = new Date(year, 4, 1); // 01 de mayo
      quarterEndDate = new Date(year, 6, 31); // 31 de julio
    } else if (month >= 8 && month <= 10) { // Trimestre 3: Agosto-Octubre
      quarterStartDate = new Date(year, 7, 1); // 01 de agosto
      quarterEndDate = new Date(year, 9, 31); // 31 de octubre
    } else if (month >= 11 && month <= 12) { // Trimestre 4: Noviembre-Diciembre
      quarterStartDate = new Date(year, 10, 1); // 01 de noviembre
      quarterEndDate = new Date(year, 11, 31); // 31 de diciembre
    } else {
      throw new Error(`Mes no válido para trimestre: ${month}. El año escolar inicia en febrero.`);
    }

    return { startDate: quarterStartDate, endDate: quarterEndDate };
  }

  async generateLibroPedagogico(courseId: number, professorId: number, managementId: number, month: number) {
    try {
      console.log('Iniciando generación del Libro Pedagógico...');

      // Obtener información básica
      const course = await this.db.course.findUnique({
        where: { id: courseId }
      });

      const professor = await this.db.professor.findUnique({
        where: { id: professorId },
        include: {
          person: true
        }
      });

      const management = await this.db.management.findUnique({
        where: { id: managementId }
      });

      if (!course || !professor || !management) {
        throw new Error('No se encontraron los datos requeridos');
      }

      // Obtener estudiantes del curso
      const students = await this.db.student.findMany({
        where: {
          status: 1,
          registrations: {
            some: {
              course_id: courseId,
              management_id: managementId,
              status: 1,
            }
          }
        },
        include: {
          person: true
        },
        orderBy: {
          person: {
            lastname: 'asc'
          }
        }
      });

      // Obtener el año de la gestión
      const year = new Date(management.start_date).getFullYear();

      // Obtener rangos de fechas
      const { startDate: monthStartDate, endDate: monthEndDate } = this.getMonthDateRange(year, month, management);
      const { startDate: quarterStartDate, endDate: quarterEndDate } = this.getQuarterDateRange(year, month, management);

      // Obtener tareas del profesor
      // Para SABER y HACER: filtrar por mes
      const monthlyTasks = await this.db.task.findMany({
        where: {
          status: 1,
          professor_id: professorId,
          course_id: courseId,
          management_id: managementId,
          dimension_id: {
            in: [2, 3] // SABER y HACER
          },
          start_date: {
            gte: monthStartDate,
            lte: monthEndDate
          }
        },
        include: {
          assignments: {
            include: {
              student: {
                include: {
                  person: true
                }
              }
            }
          },
          subject: true,
          dimension: true
        }
      });

      // Para SER, DECIDIR y AUTOEVALUACIÓN: filtrar por trimestre
      const quarterlyTasks = await this.db.task.findMany({
        where: {
          status: 1,
          professor_id: professorId,
          course_id: courseId,
          management_id: managementId,
          dimension_id: {
            in: [1, 4, 5] // SER, DECIDIR, AUTOEVALUACIÓN
          },
          start_date: {
            gte: quarterStartDate,
            lte: quarterEndDate
          }
        },
        include: {
          assignments: {
            include: {
              student: {
                include: {
                  person: true
                }
              }
            }
          },
          subject: true,
          dimension: true
        }
      });

      // Combinar todas las tareas
      const tasks = [...monthlyTasks, ...quarterlyTasks];

      console.log(`Encontradas ${tasks.length} tareas (${monthlyTasks.length} mensuales + ${quarterlyTasks.length} trimestrales) para el mes ${month}`);

      // Obtener plantilla
      const templateBuffer = await this.getLibroPedagogicoTemplate();
      const workbook = new ExcelJS.Workbook();

      // Cargar la plantilla
      const stream = new Readable();
      stream.push(templateBuffer);
      stream.push(null);
      await workbook.xlsx.read(stream);

      // Procesar la hoja FILIACION
      const filiacionSheet = workbook.getWorksheet('FILIACION');
      if (filiacionSheet) {
        // Poblar nombres de estudiantes en columna A desde fila 8
        students.forEach((student, index) => {
          const studentName = `${student.person.lastname} ${student.person.second_lastname || ''} ${student.person.name}`.trim();
          const cell = filiacionSheet.getCell(`A${index + 1}`);
          cell.value = studentName;
        });
      }

      // Procesar las demás hojas (materias)
      const processedSubjects = new Set<string>();
      const taskColumnTracker: { [key: string]: { [dimensionId: number]: number } } = {};

      // Agrupar tareas por materia y dimensión
      const tasksBySubjectAndDimension: { [key: string]: { [dimensionId: number]: any[] } } = {};

      tasks.forEach(task => {
        const subjectName = task.subject.subject;
        const excelSubjectName = this.findMatchingSubject(subjectName);

        if (!excelSubjectName) return;

        if (!tasksBySubjectAndDimension[excelSubjectName]) {
          tasksBySubjectAndDimension[excelSubjectName] = {};
        }

        if (!tasksBySubjectAndDimension[excelSubjectName][task.dimension.id]) {
          tasksBySubjectAndDimension[excelSubjectName][task.dimension.id] = [];
        }

        tasksBySubjectAndDimension[excelSubjectName][task.dimension.id].push(task);
      });

      // Procesar cada grupo de tareas
      Object.keys(tasksBySubjectAndDimension).forEach(excelSubjectName => {
        Object.keys(tasksBySubjectAndDimension[excelSubjectName]).forEach(dimensionIdStr => {
          const dimensionId = parseInt(dimensionIdStr);
          const tasksForDimension = tasksBySubjectAndDimension[excelSubjectName][dimensionId];

          if (!taskColumnTracker[excelSubjectName]) {
            taskColumnTracker[excelSubjectName] = {};
          }

          if (!taskColumnTracker[excelSubjectName][dimensionId]) {
            taskColumnTracker[excelSubjectName][dimensionId] = 0;
          }

          // Procesar cada tarea de esta dimensión
          tasksForDimension.forEach(task => {
            let column = '';
            let targetSheet = '';

            // Determinar la hoja y columna según la dimensión
            if (dimensionId === 5) { // AUTOEVALUACIÓN
              targetSheet = 'AUTOEVALUACIÓN';
              column = this.autoevaluacionColumn;
            } else if (dimensionId === 1) { // SER
              targetSheet = 'EVAL SER Y DECIDIR';
              const availableColumns = this.serDecidirColumns.ser;
              const columnIndex = taskColumnTracker[excelSubjectName][dimensionId];
              if (columnIndex < availableColumns.length) {
                column = availableColumns[columnIndex];
              }
            } else if (dimensionId === 4) { // DECIDIR
              targetSheet = 'EVAL SER Y DECIDIR';
              const availableColumns = this.serDecidirColumns.decidir;
              const columnIndex = taskColumnTracker[excelSubjectName][dimensionId];
              if (columnIndex < availableColumns.length) {
                column = availableColumns[columnIndex];
              }
            } else if (dimensionId === 2) { // SABER
              targetSheet = excelSubjectName;
              const availableColumns = this.columnConfig[excelSubjectName]?.saber || [];
              const columnIndex = taskColumnTracker[excelSubjectName][dimensionId];
              if (columnIndex < availableColumns.length) {
                column = availableColumns[columnIndex];
              }
            } else if (dimensionId === 3) { // HACER
              targetSheet = excelSubjectName;
              const availableColumns = this.columnConfig[excelSubjectName]?.hacer || [];
              const columnIndex = taskColumnTracker[excelSubjectName][dimensionId];
              if (columnIndex < availableColumns.length) {
                column = availableColumns[columnIndex];
              }
            }

            if (column) {
              const sheet = workbook.getWorksheet(targetSheet);
              if (sheet) {
                // Agregar el título de la tarea en la fila 7
                const titleCell = sheet.getCell(`${column}7`);
                titleCell.value = task.title || task.name || 'Sin título';

                // Pintar todas las notas de esta tarea en la columna asignada
                task.assignments.forEach(assignment => {
                  const studentId = assignment.student.id;
                  const studentIndex = students.findIndex(s => s.id === studentId);

                  if (studentIndex === -1) return;

                  const qualification = assignment.qualification ? parseFloat(assignment.qualification.toString()) : null;
                  if (qualification === null || isNaN(qualification)) return;

                  const equivalentScore = this.calculateEquivalentScore(qualification, dimensionId);
                  const cell = sheet.getCell(`${column}${studentIndex + 8}`);
                  cell.value = equivalentScore;
                });

                // Avanzar al siguiente índice de columna para esta dimensión
                taskColumnTracker[excelSubjectName][dimensionId]++;
              }
            }
          });
        });
      });

      // Generar nombre del archivo
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const courseName = course.course.replace(/\s+/g, '_');
      const fileName = `libro_pedagogico_${courseName}_prof${professorId}_${monthNames[month - 1]}_${year}.xlsx`;

      // Convertir workbook a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Subir a Firebase
      const fileUrl = await this.uploadLibroPedagogicoToFirebase(Buffer.from(buffer), fileName);

      return {
        ok: true,
        message: 'Libro Pedagógico generado exitosamente',
        data: {
          fileName,
          url: fileUrl
        }
      };

    } catch (error) {
      console.error('Error al generar el Libro Pedagógico:', error);
      throw new Error(`Error al generar el Libro Pedagógico: ${error.message}`);
    }
  }
}