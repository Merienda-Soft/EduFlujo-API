import { PrismaClient } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

export class ReportsService {
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

  async generateAttendanceReport(
    courseId: number,
    subjectId: number,
    professorId: number,
    managementId: number,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // 1. Obtener información básica
      const [course, subject, professor, management] = await Promise.all([
        this.getCourseInfo(courseId),
        this.getSubjectInfo(subjectId),
        this.getProfessorInfo(professorId),
        this.getManagementInfo(managementId),
      ]);

      // 2. Obtener estudiantes del curso
      const students = await this.getStudentsByCourse(courseId);

      // 3. Obtener asistencias
      const attendanceData = await this.getAttendanceData(
        courseId,
        subjectId,
        professorId,
        managementId,
        startDate,
        endDate
      );

      // 4. Determinar las fechas para la estructura
      let reportStartDate: Date | undefined;
      let reportEndDate: Date | undefined;

      if (startDate && endDate) {
        reportStartDate = new Date(startDate);
        reportEndDate = new Date(endDate);
      } else if (attendanceData.length > 0) {
        const dates = attendanceData
          .map((att) => att.attendance_date)
          .filter(Boolean);
        reportStartDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        reportEndDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      }

      // 5. Procesar datos para el Excel
      const processedData = this.processAttendanceDataWithDates(
        students,
        attendanceData,
        reportStartDate,
        reportEndDate
      );

      // 6. Generar archivo Excel
      const excelBuffer = await this.createAttendanceExcel(
        processedData,
        course,
        subject,
        professor,
        management,
        startDate,
        endDate
      );

      // 7. Subir a Firebase y obtener URL
      const fileName = this.generateFileName(
        course,
        subject,
        professor,
        management
      );
      const downloadUrl = await this.uploadToFirebase(
        new Uint8Array(excelBuffer),
        fileName
      );

      return {
        ok: true,
        downloadUrl,
        fileName,
        totalStudents: students.length,
        reportPeriod: {
          startDate: startDate || "Febrero",
          endDate: endDate || "Diciembre",
        },
      };
    } catch (error) {
      console.error("Error generating attendance report:", error);
      throw new Error(
        `Error al generar el reporte de asistencia: ${error.message}`
      );
    }
  }

  private async getCourseInfo(courseId: number) {
    return await this.db.course.findUnique({
      where: { id: courseId },
      include: { degree: true },
    });
  }

  private async getSubjectInfo(subjectId: number) {
    return await this.db.subject.findUnique({
      where: { id: subjectId },
    });
  }

  private async getProfessorInfo(professorId: number) {
    return await this.db.professor.findUnique({
      where: { id: professorId },
      include: { person: true },
    });
  }

  private async getManagementInfo(managementId: number) {
    return await this.db.management.findUnique({
      where: { id: managementId },
    });
  }

  private async getStudentsByCourse(courseId: number) {
    return await this.db.registration.findMany({
      where: {
        course_id: courseId,
        // status: 1  // Remover si no existe este campo en Registration
      },
      include: {
        student: {
          include: {
            person: true,
          },
        },
      },
      orderBy: [
        { student: { person: { lastname: "asc" } } },
        { student: { person: { second_lastname: "asc" } } },
        { student: { person: { name: "asc" } } },
      ],
    });
  }

  private async getAttendanceData(
    courseId: number,
    subjectId: number,
    professorId: number,
    managementId: number,
    startDate?: string,
    endDate?: string
  ) {
    const whereCondition: any = {
      course_id: courseId,
      subject_id: subjectId,
      professor_id: professorId,
      management_id: managementId,
    };

    if (startDate && endDate) {
      whereCondition.attendance_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendanceRecords = await this.db.attendance.findMany({
      where: whereCondition,
      include: {
        course: true,
        subject: true,
        professor: {
          include: {
            person: true,
          },
        },
        management: true,
      },
      orderBy: [{ attendance_date: "asc" }],
    });

    console.log("Raw attendance records:", attendanceRecords.length);
    if (attendanceRecords.length > 0) {
      console.log(
        "First attendance record sample:",
        JSON.stringify(attendanceRecords[0], null, 2)
      );
    }

    // Obtener los attendance records para cada attendance
    const attendanceWithRecords = await Promise.all(
      attendanceRecords.map(async (attendance) => {
        const records = await this.db.attendanceRecord.findMany({
          where: {
            attendance_id: attendance.id,
          },
        });

        console.log(
          `Attendance ${attendance.id} (${attendance.attendance_date}) has ${records.length} records:`,
          records
        );

        // Crear estructura compatible con el código existente
        const attendancesWithStatus = records.map((record) => {
          return {
            student_id: record.student_id,
            status_attendance: this.mapAttendanceStatus(
              record.status_attendance
            ),
          };
        });

        return {
          ...attendance,
          attendances: attendancesWithStatus,
        };
      })
    );

    return attendanceWithRecords;
  }

  private mapAttendanceStatus(status: string): string {
    if (!status) return "P";

    // Limpiar espacios en blanco y convertir a uppercase
    const cleanStatus = status.trim().toUpperCase();

    switch (cleanStatus) {
      case "A":
        return "A"; // Ausente
      case "P":
        return "P"; // Presente
      case "J":
        return "L"; // Licencia (mapear J a L para compatibilidad)
      case "L":
        return "L"; // Licencia
      case "T":
        return "T"; // Tardanza
      default:
        return "P"; // Por defecto presente
    }
  }

  private processAttendanceDataWithDates(
    students: any[],
    attendanceData: any[],
    startDate?: Date,
    endDate?: Date
  ) {
    if (!students || students.length === 0) {
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(currentYear, 1, 1); // Febrero
      const defaultEnd = new Date(currentYear, 11, 31); // Diciembre
      const monthlyData = this.generateMonthlyStructure(
        defaultStart,
        defaultEnd
      );

      return {
        students: [],
        monthlyData: monthlyData,
        summary: {
          totalStudents: 0,
          totalClasses: 0,
          overallAttendanceRate: "0",
        },
      };
    }

    // Crear mapa de asistencias por estudiante y fecha
    const attendanceMap = new Map();
    attendanceData.forEach((attendanceRecord) => {
      const date = attendanceRecord.attendance_date
        ?.toISOString()
        .split("T")[0];
      if (date && attendanceRecord.attendances) {
        attendanceRecord.attendances.forEach((record: any) => {
          const studentId = record.student_id;
          const key = `${studentId}-${date}`;
          console.log(
            `Setting attendance: ${key} = ${record.status_attendance}`
          );
          attendanceMap.set(key, record.status_attendance);
        });
      }
    });

    console.log("Final attendance map size:", attendanceMap.size);
    console.log(
      "Sample attendance entries:",
      Array.from(attendanceMap.entries()).slice(0, 10)
    );

    // Determinar rango de fechas para la estructura mensual
    let structureStartDate: Date;
    let structureEndDate: Date;

    if (startDate && endDate) {
      structureStartDate = startDate;
      structureEndDate = endDate;
    } else {
      const currentYear = new Date().getFullYear();

      if (attendanceData.length > 0) {
        const firstDate = attendanceData[0].attendance_date;
        const year = firstDate ? firstDate.getFullYear() : currentYear;
        structureStartDate = new Date(year, 1, 1); // Febrero
        structureEndDate = new Date(year, 11, 31); // Diciembre
      } else {
        structureStartDate = new Date(currentYear, 1, 1); // Febrero
        structureEndDate = new Date(currentYear, 11, 31); // Diciembre
      }
    }

    // Generar estructura mensual
    const monthlyData = this.generateMonthlyStructure(
      structureStartDate,
      structureEndDate
    );

    // Procesar datos de estudiantes
    const processedStudents = students.map((registration) => {
      const student = registration.student;
      const studentMonthlyAttendance = monthlyData.map((month) => {
        const monthAttendances = month.workingDays.map((day) => {
          if (day.date) {
            const key = `${student.id}-${day.date}`;
            const attendance = attendanceMap.get(key);
            if (student.id === students[0]?.student?.id) {
              console.log(
                `Student ${student.id}, Date ${day.date}, Key: ${key}, Attendance: ${attendance}`
              );
            }
            return attendance || null;
          }
          return null;
        });

        // Actualizar los contadores para los nuevos valores
        const presentCount = monthAttendances.filter(
          (att) => att === "P"
        ).length;
        const absentCount = monthAttendances.filter(
          (att) => att === "A"
        ).length;
        const licenseCount = monthAttendances.filter(
          (att) => att === "L"
        ).length;
        const lateCount = monthAttendances.filter((att) => att === "T").length;
        const totalDaysWithData = monthAttendances.filter(
          (att) => att !== null
        ).length;

        return {
          month: month.month,
          year: month.year,
          attendances: monthAttendances,
          statistics: {
            present: presentCount,
            absent: absentCount,
            license: licenseCount,
            late: lateCount,
            totalDays: totalDaysWithData,
            percentage:
              totalDaysWithData > 0
                ? ((presentCount / totalDaysWithData) * 100).toFixed(1)
                : "0",
          },
        };
      });

      const totalPresent = studentMonthlyAttendance.reduce(
        (sum, month) => sum + month.statistics.present,
        0
      );
      const totalAbsent = studentMonthlyAttendance.reduce(
        (sum, month) => sum + month.statistics.absent,
        0
      );
      const totalLicense = studentMonthlyAttendance.reduce(
        (sum, month) => sum + month.statistics.license,
        0
      );
      const totalLate = studentMonthlyAttendance.reduce(
        (sum, month) => sum + month.statistics.late,
        0
      );
      const totalDays = studentMonthlyAttendance.reduce(
        (sum, month) => sum + month.statistics.totalDays,
        0
      );

      return {
        student: {
          id: student.id,
          fullName: `${student.person?.lastname || ""} ${
            student.person?.second_lastname || ""
          } ${student.person?.name || ""}`.trim(),
          ci: student.person?.ci || "Sin CI",
          rude: student.rude || "Sin RUDE",
        },
        monthlyAttendance: studentMonthlyAttendance,
        totalStatistics: {
          present: totalPresent,
          absent: totalAbsent,
          license: totalLicense,
          late: totalLate,
          totalDays: totalDays,
          percentage:
            totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : "0",
        },
      };
    });

    // Calcular estadísticas generales
    const totalStudents = processedStudents.length;
    const totalClasses = monthlyData.reduce(
      (sum, month) => sum + month.workingDays.filter((day) => day.date).length,
      0
    );
    const overallPresentCount = processedStudents.reduce(
      (sum, student) => sum + student.totalStatistics.present,
      0
    );
    const overallTotalDays = processedStudents.reduce(
      (sum, student) => sum + student.totalStatistics.totalDays,
      0
    );
    const overallAttendanceRate =
      overallTotalDays > 0
        ? ((overallPresentCount / overallTotalDays) * 100).toFixed(1)
        : "0";

    return {
      students: processedStudents,
      monthlyData: monthlyData,
      summary: {
        totalStudents,
        totalClasses,
        overallAttendanceRate,
      },
    };
  }

  private generateMonthlyStructure(startDate: Date, endDate: Date) {
    const months = [];
    const monthNames = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];

    const dayLetters = ["L", "M", "X", "J", "V", "L", "M"]; // Lunes a Viernes principalmente

    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();

    while (
      currentYear < endYear ||
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      const workingDays = [];

      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const currentDate = new Date(currentYear, currentMonth, day);
        const dayOfWeek = currentDate.getDay();

        // Solo días laborables (Lunes=1 a Viernes=5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = currentDate.toISOString().split("T")[0];
          workingDays.push({
            day: day,
            date: dateStr,
            dayLetter: dayLetters[dayOfWeek - 1] || "L",
          });
        }
      }

      months.push({
        month: monthNames[currentMonth],
        year: currentYear,
        workingDays: workingDays,
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    return months;
  }

  private async createAttendanceExcel(
    data: any,
    course: any,
    subject: any,
    professor: any,
    management: any,
    startDate?: string,
    endDate?: string
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte de Asistencia");

    // Configurar el estilo general
    worksheet.views = [
      {
        showGridLines: true,
        zoomScale: 90,
      },
    ];

    // Agregar encabezado principal mejorado
    this.addMainHeader(
      worksheet,
      course,
      subject,
      professor,
      management,
      startDate,
      endDate
    );

    // Configurar encabezados de columnas y días
    this.createMonthlyHeaders(worksheet, data.monthlyData);
    this.createDayNumbers(worksheet, data.monthlyData);

    // Agregar datos de estudiantes
    data.students.forEach((studentData: any, index: number) => {
      const rowData = [studentData.student.fullName];

      // Agregar asistencias de cada mes
      studentData.monthlyAttendance.forEach((monthData: any) => {
        monthData.attendances.forEach((attendance: any) => {
          rowData.push(this.getAttendanceSymbol(attendance));
        });
      });

      const row = worksheet.addRow(rowData);
      this.styleStudentRow(row, index);
    });

    // Agregar leyenda mejorada
    this.addLegend(worksheet);

    // Ajustar anchos de columna
    this.adjustColumnWidths(worksheet, data.monthlyData);

    return await workbook.xlsx.writeBuffer();
  }

  private createMonthlyHeaders(worksheet: any, monthlyData: any[]) {
    const headerRow = worksheet.getRow(7);
    let colIndex = 2;

    monthlyData.forEach((monthData: any) => {
      const startCol = colIndex;
      const endCol = colIndex + monthData.workingDays.length - 1;

      // Merge cells para el nombre del mes
      if (monthData.workingDays.length > 0) {
        worksheet.mergeCells(7, startCol, 7, endCol);
        const monthCell = headerRow.getCell(startCol);
        monthCell.value = monthData.month;
        monthCell.alignment = { horizontal: "center", vertical: "middle" };
        monthCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        monthCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        monthCell.border = {
          top: { style: "thick" },
          left: { style: "thick" },
          bottom: { style: "thick" },
          right: { style: "thick" },
        };
      }

      colIndex += monthData.workingDays.length;
    });

    // Encabezado de estudiantes
    const studentHeader = headerRow.getCell(1);
    studentHeader.value = "APELLIDOS Y NOMBRE(S)";
    studentHeader.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    studentHeader.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    studentHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    studentHeader.border = {
      top: { style: "thick" },
      left: { style: "thick" },
      bottom: { style: "thick" },
      right: { style: "thick" },
    };

    headerRow.height = 30;
  }

  private createDayNumbers(worksheet: any, monthlyData: any[]) {
    const dayRow = worksheet.getRow(8);
    const dayLabelRow = worksheet.getRow(9);
    let colIndex = 2;

    monthlyData.forEach((monthData: any) => {
      monthData.workingDays.forEach((day: any) => {
        // Número del día
        const dayCell = dayRow.getCell(colIndex);
        dayCell.value = day.day || "";
        dayCell.alignment = { horizontal: "center", vertical: "middle" };
        dayCell.font = { size: 9, bold: true };
        dayCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F2F2" },
        };
        dayCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Letra del día (L, M, X, J, V)
        const dayLabelCell = dayLabelRow.getCell(colIndex);
        dayLabelCell.value = day.dayLetter || "L";
        dayLabelCell.alignment = { horizontal: "center", vertical: "middle" };
        dayLabelCell.font = { bold: true, size: 8 };
        dayLabelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2EFDA" },
        };
        dayLabelCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        colIndex++;
      });
    });

    // Configurar altura de filas
    dayRow.height = 20;
    dayLabelRow.height = 20;
  }

  private styleStudentRow(row: any, index: number) {
    row.height = 25;
    row.eachCell((cell: any, colNumber: number) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      if (colNumber === 1) {
        // Nombre del estudiante
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { size: 10 };

        // Alternar colores de fila para mejor legibilidad
        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9F9F9" },
          };
        }
      } else {
        // Días de asistencia
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true, size: 10 };

        // Colorear según el tipo de asistencia
        const value = cell.value;
        if (value === "P") {
          cell.font = { ...cell.font, color: { argb: "FF008000" } }; // Verde para presente
        } else if (value === "A") {
          cell.font = { ...cell.font, color: { argb: "FFFF0000" } }; // Rojo para ausente
        } else if (value === "L") {
          cell.font = { ...cell.font, color: { argb: "FFFF8C00" } }; // Naranja para licencia
        } else if (value === "T") {
          cell.font = { ...cell.font, color: { argb: "FFFF6600" } }; // Naranja oscuro para tardanza
        } else {
          cell.font = { ...cell.font, color: { argb: "FF999999" } }; // Gris para sin registro
        }

        // Alternar colores de fila
        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9F9F9" },
          };
        }
      }
    });
  }

  private addMainHeader(
    worksheet: any,
    course: any,
    subject: any,
    professor: any,
    management: any,
    startDate?: string,
    endDate?: string
  ) {
    // Insertar filas para el encabezado
    worksheet.insertRow(1, []);
    worksheet.insertRow(2, []);
    worksheet.insertRow(3, []);
    worksheet.insertRow(4, []);
    worksheet.insertRow(5, []);
    worksheet.insertRow(6, []);

    // Título principal
    worksheet.getCell("A1").value = "REPORTE DE ASISTENCIA";
    worksheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: { argb: "FF4472C4" },
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Información del reporte con mejor estilo
    const infoStyle = { bold: true, size: 11, color: { argb: "FF333333" } };

    worksheet.getCell("A2").value = `Curso: ${
      course?.course || "N/A"
    } - Paralelo: ${course?.parallel?.trim() || "N/A"}`;
    worksheet.getCell("A2").font = infoStyle;

    worksheet.getCell("A3").value = `Materia: ${subject?.subject || "N/A"}`;
    worksheet.getCell("A3").font = infoStyle;

    worksheet.getCell("A4").value = `Profesor: ${
      professor?.person?.name || ""
    } ${professor?.person?.lastname || ""} ${
      professor?.person?.second_lastname || ""
    }`.trim();
    worksheet.getCell("A4").font = infoStyle;

    worksheet.getCell("A5").value = `Gestión: ${
      management?.management || "N/A"
    }`;
    worksheet.getCell("A5").font = infoStyle;

    const period =
      startDate && endDate
        ? `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
        : "Gestión completa";
    worksheet.getCell("A6").value = `Período: ${period}`;
    worksheet.getCell("A6").font = infoStyle;

    // Agregar una línea separadora
    worksheet.addRow([]);
  }

  private addLegend(worksheet: any) {
    const lastRow = worksheet.rowCount;

    worksheet.addRow([]);
    worksheet.addRow(["LEYENDA:"]);
    worksheet.addRow(["P = Presente"]);
    worksheet.addRow(["A = Ausente"]);
    worksheet.addRow(["L = Licencia/Justificado"]);
    worksheet.addRow(["T = Tardanza"]);
    worksheet.addRow(["- = Sin registro"]);

    // Estilo para la leyenda
    const legendStartRow = lastRow + 2;
    for (let i = legendStartRow; i <= lastRow + 7; i++) {
      const cell = worksheet.getCell(`A${i}`);

      if (i === legendStartRow) {
        // Título de la leyenda
        cell.font = { bold: true, size: 12, color: { argb: "FF4472C4" } };
      } else {
        // Items de la leyenda
        cell.font = { size: 10 };
        // Agregar color según el tipo
        if (cell.value && typeof cell.value === "string") {
          if (cell.value.startsWith("P =")) {
            cell.font = { ...cell.font, color: { argb: "FF008000" } }; // Verde para presente
          } else if (cell.value.startsWith("A =")) {
            cell.font = { ...cell.font, color: { argb: "FFFF0000" } }; // Rojo para ausente
          } else if (cell.value.startsWith("L =")) {
            cell.font = { ...cell.font, color: { argb: "FFFF8C00" } }; // Naranja para licencia
          } else if (cell.value.startsWith("T =")) {
            cell.font = { ...cell.font, color: { argb: "FFFF6600" } }; // Naranja oscuro para tardanza
          } else if (cell.value.startsWith("- =")) {
            cell.font = { ...cell.font, color: { argb: "FF999999" } }; // Gris para sin registro
          }
        }
      }
    }
  }

  private adjustColumnWidths(worksheet: any, monthlyData: any[]) {
    // Columna de nombres más ancha
    worksheet.getColumn(1).width = 35;

    // Columnas de días más pequeñas
    let colIndex = 2;
    monthlyData.forEach((monthData: any) => {
      monthData.workingDays.forEach(() => {
        worksheet.getColumn(colIndex).width = 4;
        colIndex++;
      });
    });
  }

  private getAttendanceSymbol(status: string | null): string {
    if (!status) return "-";

    const cleanStatus = status.trim().toUpperCase();
    switch (cleanStatus) {
      case "P":
        return "P"; // Presente
      case "A":
        return "A"; // Ausente
      case "L":
        return "L"; // Licencia
      case "T":
        return "T"; // Tardanza
      default:
        return "-";
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  }

  private generateFileName(
    course: any,
    subject: any,
    professor: any,
    management: any
  ): string {
    const courseName = course?.course?.replace(/\s+/g, "_") || "curso";
    const subjectName = subject?.subject?.replace(/\s+/g, "_") || "materia";
    const dateStr = new Date().toISOString().split("T")[0];

    return `reporte_asistencia_${courseName}_${subjectName}_${dateStr}.xlsx`;
  }

  private async uploadToFirebase(
    buffer: Uint8Array,
    fileName: string
  ): Promise<string> {
    try {
      const storageRef = ref(this.storage, `reports/attendance/${fileName}`);
      const snapshot = await uploadBytes(storageRef, buffer);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      throw new Error("Error al subir el archivo a Firebase");
    }
  }

  // Método de test para debug
  async testAttendanceData(
    courseId: number,
    subjectId: number,
    professorId: number,
    managementId: number
  ) {
    try {
      console.log("=== TESTING ATTENDANCE DATA ===");

      const attendanceData = await this.getAttendanceData(
        courseId,
        subjectId,
        professorId,
        managementId
      );

      console.log("Total attendance records:", attendanceData.length);

      attendanceData.forEach((attendance) => {
        console.log(`\nAttendance ID: ${attendance.id}`);
        console.log(`Date: ${attendance.attendance_date}`);
        console.log(`Records:`, attendance.attendances);
      });

      return {
        ok: true,
        data: attendanceData,
        message: "Test completed successfully",
      };
    } catch (error) {
      console.error("Error in test:", error);
      return {
        ok: false,
        error: error.message,
      };
    }
  }
}
