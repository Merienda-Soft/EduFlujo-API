import { PrismaClient } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  private numberToColumn(num: number): string {
    let column = '';
    while (num > 0) {
      num--;
      column = String.fromCharCode(65 + (num % 26)) + column;
      num = Math.floor(num / 26);
    }
    return column;
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

  public async getManagementInfo(managementId: number) {
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

      // Determinar el rango real de días para este mes
      const actualStartDay =
        currentYear === startDate.getFullYear() &&
        currentMonth === startDate.getMonth()
          ? startDate.getDate()
          : 1;

      const actualEndDay =
        currentYear === endDate.getFullYear() &&
        currentMonth === endDate.getMonth()
          ? endDate.getDate()
          : monthEnd.getDate();

      for (let day = actualStartDay; day <= actualEndDay; day++) {
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

      // Solo agregar el mes si tiene días laborables en el rango
      if (workingDays.length > 0) {
        months.push({
          month: monthNames[currentMonth],
          year: currentYear,
          workingDays: workingDays,
        });
      }

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

  async generateCentralizadorAnual(courseId: number, managementId: number) {
    try {
      // 1. Obtener información básica
      const [course, management] = await Promise.all([
        this.getCourseInfo(courseId),
        this.getManagementInfo(managementId),
      ]);

      // 2. Obtener estudiantes del curso
      const students = await this.getStudentsByCourse(courseId);

      // 3. Obtener todas las materias del curso usando Assignment
      const assignments = await this.db.assignment.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
        },
        include: {
          subject: true,
          professor: {
            include: {
              person: true,
            },
          },
        },
        distinct: ["subject_id"], // Para evitar duplicados por profesor
      });

      // 4. Obtener todas las dimensiones para calcular los porcentajes
      const dimensions = await this.db.dimension.findMany();

      // 5. Para cada estudiante y materia, calcular las notas por trimestre
      const studentGrades = await this.calculateStudentGrades(
        students,
        assignments,
        managementId,
        dimensions
      );

      // 6. Generar el archivo Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Centralizador Anual");

      // 7. Configurar el Excel
      await this.setupCentralizadorExcel(
        worksheet,
        students,
        assignments,
        studentGrades,
        course,
        management
      );

      // 8. Generar buffer y subir a Firebase
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = this.generateCentralizadorFileName(course, management);
      const downloadURL = await this.uploadCentralizadorToFirebase(
        buffer,
        fileName
      );

      return {
        success: true,
        downloadURL,
        fileName,
        message: "Reporte centralizador anual generado exitosamente",
        data: {
          course: course,
          management: management,
          students: studentGrades, // Incluir los datos detallados en la respuesta
          subjects: assignments.map((a) => a.subject),
        },
      };
    } catch (error) {
      console.error("Error generating centralizador anual:", error);
      throw new Error("Error al generar el reporte centralizador anual");
    }
  }

  private async calculateStudentGrades(
    students: any[],
    assignments: any[],
    managementId: number,
    dimensions: any[]
  ) {
    const studentGrades = [];

    for (const registration of students) {
      const studentData = {
        student: registration.student, // Extraer el estudiante del registro
        subjects: [],
        finalAverage: 0,
        status: "REPROBADO",
      };

      for (const assignment of assignments) {
        const subjectGrades = {
          subject: assignment.subject,
          professor: assignment.professor,
          trimesters: {
            Q1: {
              saber: 0,
              hacer: 0,
              ser: 0,
              decidir: 0,
              autoevaluacion: 0,
              total: 0,
            },
            Q2: {
              saber: 0,
              hacer: 0,
              ser: 0,
              decidir: 0,
              autoevaluacion: 0,
              total: 0,
            },
            Q3: {
              saber: 0,
              hacer: 0,
              ser: 0,
              decidir: 0,
              autoevaluacion: 0,
              total: 0,
            },
          },
          finalAverage: 0,
        };

        // Calcular notas por trimestre
        for (const trimester of ["Q1", "Q2", "Q3"]) {
          const trimesterGrades = await this.calculateTrimesterGrades(
            registration.student.id, // Usar el ID del estudiante del registro
            assignment.subject_id,
            managementId,
            trimester,
            dimensions
          );
          subjectGrades.trimesters[trimester] = trimesterGrades;
        }

        // Calcular promedio final de la materia
        const totalTrimesters = Object.values(subjectGrades.trimesters);
        subjectGrades.finalAverage =
          totalTrimesters.reduce((sum, t: any) => sum + t.total, 0) /
          totalTrimesters.length;

        studentData.subjects.push(subjectGrades);
      }

      // Calcular promedio final del estudiante
      if (studentData.subjects.length > 0) {
        studentData.finalAverage =
          studentData.subjects.reduce(
            (sum, subject: any) => sum + subject.finalAverage,
            0
          ) / studentData.subjects.length;
        studentData.status =
          studentData.finalAverage >= 51 ? "APROBADO" : "REPROBADO";
      }

      studentGrades.push(studentData);
    }

    return studentGrades;
  }

  /**
   * Cálculo de notas por trimestre con ponderación de tareas
   * 
   * Sistema de ponderación:
   * - SER (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * - SABER (45 pts): Se calcula por meses dentro del trimestre, promediando los 3 meses  
   * - HACER (40 pts): Se calcula por meses dentro del trimestre, promediando los 3 meses
   * - DECIDIR (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * - AUTOEVALUACIÓN (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * 
   * Cada tarea tiene un weight (porcentaje) que determina su importancia dentro de la dimensión.
   * Por ejemplo: Si SABER vale 45 pts y una tarea tiene weight=50%, entonces esa tarea vale 
   * el 50% de los 45 pts. Si el estudiante saca 100 en la tarea, obtiene 22.5 pts (50% de 45).
   * 
   * Para SABER y HACER, se calcula mes por mes y luego se promedian los 3 meses del trimestre.
   */
  private async calculateTrimesterGrades(
    studentId: number,
    subjectId: number,
    managementId: number,
    quarter: string,
    dimensions: any[]
  ) {
    console.log(
      `Calculando trimestre ${quarter} para estudiante ${studentId}, materia ${subjectId}`
    );

    // Configuración de puntajes por dimensión
    const dimensionScores = {
      1: 5,   // SER
      2: 45,  // SABER
      3: 40,  // HACER
      4: 5,   // DECIDIR
      5: 5    // AUTOEVALUACIÓN
    };

    const grades = {
      saber: 0,
      hacer: 0,
      ser: 0,
      decidir: 0,
      autoevaluacion: 0,
      total: 0,
      details: {
        saber: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        hacer: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        ser: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        decidir: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        autoevaluacion: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
      },
    };

    // Obtener información del management para las fechas
    const management = await this.db.management.findUnique({
      where: { id: managementId }
    });

    if (!management) {
      throw new Error('Management no encontrado');
    }

    // Determinar fechas del trimestre
    let quarterStart: Date, quarterEnd: Date;
    switch (quarter) {
      case 'Q1':
        quarterStart = new Date(management.first_quarter_start);
        quarterEnd = new Date(management.first_quarter_end);
        break;
      case 'Q2':
        quarterStart = new Date(management.second_quarter_start);
        quarterEnd = new Date(management.second_quarter_end);
        break;
      case 'Q3':
        quarterStart = new Date(management.third_quarter_start);
        quarterEnd = new Date(management.third_quarter_end);
        break;
      default:
        throw new Error(`Quarter inválido: ${quarter}`);
    }

    // 1. Calcular SER, DECIDIR y AUTOEVALUACIÓN por trimestre completo
    const quarterlyTasks = await this.db.task.findMany({
      where: {
        subject_id: subjectId,
        management_id: managementId,
        status: 1,
        dimension_id: { in: [1, 4, 5] }, // SER, DECIDIR, AUTOEVALUACIÓN
        end_date: {
          gte: quarterStart,
          lte: quarterEnd
        }
      },
      include: {
        assignments: {
          where: {
            student_id: studentId,
          },
        },
        dimension: true,
      },
    });

    // Procesar tareas por trimestre (SER, DECIDIR, AUTOEVALUACIÓN)
    quarterlyTasks.forEach(task => {
      const assignment = task.assignments[0];
      if (assignment && assignment.qualification) {
        const taskScore = parseFloat(assignment.qualification);
        const taskWeight = task.weight || 0;
        const dimensionId = task.dimension_id;
        
        let dimensionName = '';
        switch (dimensionId) {
          case 1: dimensionName = 'ser'; break;
          case 4: dimensionName = 'decidir'; break;
          case 5: dimensionName = 'autoevaluacion'; break;
        }

        if (dimensionName) {
          grades.details[dimensionName].tasks.push({
            taskName: task.name,
            score: taskScore,
            weight: taskWeight
          });
          grades.details[dimensionName].totalWeight += taskWeight;
          grades.details[dimensionName].totalScore += (taskScore * taskWeight) / 100;
        }
      }
    });

    // 2. Calcular SABER y HACER por meses
    const year = quarterStart.getFullYear();
    let monthRanges = [];

    switch (quarter) {
      case 'Q1':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 1, 28) }, // hasta 28 feb
          { start: new Date(year, 2, 1), end: new Date(year, 2, 31) }, // marzo completo
          { start: new Date(year, 3, 1), end: quarterEnd } // abril hasta fin Q1
        ];
        break;
      case 'Q2':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 4, 31) }, // mayo completo
          { start: new Date(year, 5, 1), end: new Date(year, 6, 31) }, // jun-jul
          { start: new Date(year, 7, 1), end: quarterEnd } // agosto hasta fin Q2
        ];
        break;
      case 'Q3':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 8, 30) }, // septiembre
          { start: new Date(year, 9, 1), end: new Date(year, 9, 31) }, // octubre
          { start: new Date(year, 10, 1), end: quarterEnd } // nov-dic hasta fin Q3
        ];
        break;
    }

    // Calcular SABER y HACER por cada mes
    for (const monthRange of monthRanges) {
      const monthlyTasks = await this.db.task.findMany({
        where: {
          subject_id: subjectId,
          management_id: managementId,
          status: 1,
          dimension_id: { in: [2, 3] }, // SABER y HACER
          end_date: {
            gte: monthRange.start,
            lte: monthRange.end
          }
        },
        include: {
          assignments: {
            where: {
              student_id: studentId,
            },
          },
          dimension: true,
        },
      });

      // Agrupar por dimensión para este mes
      const monthlyByDimension = {
        saber: monthlyTasks.filter(t => t.dimension_id === 2),
        hacer: monthlyTasks.filter(t => t.dimension_id === 3)
      };

      // Procesar cada dimensión para este mes
      for (const [dimensionName, tasks] of Object.entries(monthlyByDimension)) {
        if (tasks.length > 0) {
          let monthTotalWeight = 0;
          let monthWeightedScore = 0;

          tasks.forEach(task => {
            const assignment = task.assignments[0];
            if (assignment && assignment.qualification) {
              const taskScore = parseFloat(assignment.qualification);
              const taskWeight = task.weight || 0;
              
              monthTotalWeight += taskWeight;
              monthWeightedScore += (taskScore * taskWeight) / 100;

              grades.details[dimensionName].tasks.push({
                taskName: task.name,
                score: taskScore,
                weight: taskWeight,
                month: monthRange.start.getMonth() + 1
              });
            }
          });

          // Si hay tareas en este mes, calcular el puntaje del mes
          if (monthTotalWeight > 0) {
            // El puntaje del mes es el promedio ponderado de las tareas del mes
            const monthPercentage = (monthWeightedScore / monthTotalWeight) * 100;
            const dimensionMaxScore = dimensionName === 'saber' ? 45 : 40;
            const monthPoints = (monthPercentage * dimensionMaxScore) / 100;
            
            grades.details[dimensionName].totalScore += monthPoints;
            grades.details[dimensionName].totalWeight += 1; // Cada mes cuenta como 1
          }
        }
      }
    }

    // Calcular puntajes finales
    // Para SER, DECIDIR, AUTOEVALUACIÓN (por trimestre)
    ['ser', 'decidir', 'autoevaluacion'].forEach(dimensionName => {
      const detail = grades.details[dimensionName];
      if (detail.totalWeight > 0) {
        const dimensionId = dimensionName === 'ser' ? 1 : (dimensionName === 'decidir' ? 4 : 5);
        const maxScore = dimensionScores[dimensionId];
        // Calcular porcentaje obtenido basado en peso total
        const percentage = (detail.totalScore / detail.totalWeight) * 100;
        detail.finalScore = (percentage * maxScore) / 100;
        grades[dimensionName] = Math.round(detail.finalScore);
      }
    });

    // Para SABER y HACER (promedio de meses)
    ['saber', 'hacer'].forEach(dimensionName => {
      const detail = grades.details[dimensionName];
      if (detail.totalWeight > 0) {
        const dimensionId = dimensionName === 'saber' ? 2 : 3;
        const maxScore = dimensionScores[dimensionId];
        // Promedio de los meses
        detail.finalScore = detail.totalScore / detail.totalWeight;
        grades[dimensionName] = Math.round(detail.finalScore);
      }
    });

    // Calcular total
    grades.total =
      grades.saber +
      grades.hacer +
      grades.ser +
      grades.decidir +
      grades.autoevaluacion;

    console.log(`Trimestre ${quarter} calculado:`, grades);
    
    // Validación: El total debe estar entre 0 y 100
    if (grades.total < 0 || grades.total > 100) {
      console.warn(`⚠️ Total fuera de rango para estudiante ${studentId}: ${grades.total}`);
    }
    
    return grades;
  }

  /**
   * Método helper para obtener los puntajes máximos por dimensión
   */
  private getDimensionScores() {
    return {
      1: 5,   // SER
      2: 45,  // SABER
      3: 40,  // HACER
      4: 5,   // DECIDIR
      5: 5    // AUTOEVALUACIÓN
    };
  }

  private async setupCentralizadorExcel(
    worksheet: ExcelJS.Worksheet,
    students: any[],
    assignments: any[],
    studentGrades: any[],
    course: any,
    management: any
  ) {
    // Calcular número total de columnas
    const totalColumns = 2 + assignments.length * 4 + 2; // N°, NOMBRE, (4 cols x materia), PROMEDIO, SITUACION

    // Configurar título
    worksheet.mergeCells(`A1:${this.numberToColumn(totalColumns)}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `CENTRALIZADOR ANUAL - ${course.course} - GESTIÓN ${management.management}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" }, // Steel blue
    };
    titleCell.border = {
      top: { style: "thick" },
      left: { style: "thick" },
      bottom: { style: "thick" },
      right: { style: "thick" },
    };

    // Fila 2: N° y APELLIDOS Y NOMBRES (que abarcan 2 filas)
    worksheet.mergeCells("A2:A3");
    const numCell = worksheet.getCell("A2");
    numCell.value = "N°";
    numCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    numCell.alignment = { horizontal: "center", vertical: "middle" };
    numCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4682B4" }, // Steel blue
    };

    worksheet.mergeCells("B2:B3");
    const nameCell = worksheet.getCell("B2");
    nameCell.value = "APELLIDOS Y NOMBRES";
    nameCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    nameCell.alignment = { horizontal: "center", vertical: "middle" };
    nameCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4682B4" }, // Steel blue
    };

    // Configurar encabezados de materias
    let currentCol = 3;
    assignments.forEach((assignment) => {
      // Fila 2: Nombre de la materia (abarca 4 columnas)
      const startCol = this.numberToColumn(currentCol);
      const endCol = this.numberToColumn(currentCol + 3);
      worksheet.mergeCells(`${startCol}2:${endCol}2`);

      const subjectCell = worksheet.getCell(`${startCol}2`);
      subjectCell.value = assignment.subject.subject;
      subjectCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      subjectCell.alignment = { horizontal: "center" };
      subjectCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF5F9EA0" }, // Cadet blue
      };

      // Fila 3: Subencabezados (1T, 2T, 3T, PR)
      const subHeaders = ["1T", "2T", "3T", "PR"];
      subHeaders.forEach((header, subIndex) => {
        const col = this.numberToColumn(currentCol + subIndex);
        const cell = worksheet.getCell(`${col}3`);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB0E0E6" }, // Powder blue
        };
      });

      currentCol += 4;
    });

    // PROMEDIO FINAL y SITUACIÓN (abarcan 2 filas)
    const promedioCol = this.numberToColumn(currentCol);
    const situacionCol = this.numberToColumn(currentCol + 1);

    worksheet.mergeCells(`${promedioCol}2:${promedioCol}3`);
    const promedioCell = worksheet.getCell(`${promedioCol}2`);
    promedioCell.value = "PROMEDIO FINAL";
    promedioCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    promedioCell.alignment = { horizontal: "center", vertical: "middle" };
    promedioCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4682B4" }, // Steel blue
    };

    worksheet.mergeCells(`${situacionCol}2:${situacionCol}3`);
    const situacionCell = worksheet.getCell(`${situacionCol}2`);
    situacionCell.value = "SITUACIÓN";
    situacionCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    situacionCell.alignment = { horizontal: "center", vertical: "middle" };
    situacionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4682B4" }, // Steel blue
    };

    // Aplicar bordes a los encabezados
    for (let row = 2; row <= 3; row++) {
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: "medium" },
          left: { style: "medium" },
          bottom: { style: "medium" },
          right: { style: "medium" },
        };
      }
    }

    // Llenar datos de estudiantes (empezando desde la fila 4)
    studentGrades.forEach((studentData, index) => {
      const row = worksheet.getRow(index + 4);
      let colIndex = 1;

      // Número y nombre
      const numCell = row.getCell(colIndex++);
      numCell.value = index + 1;
      numCell.font = { bold: true };

      const nameCell = row.getCell(colIndex++);
      nameCell.value = `${studentData.student.person.lastname} ${studentData.student.person.name}`;
      nameCell.alignment = { horizontal: "left" };

      // Notas por materia
      studentData.subjects.forEach((subjectGrade: any) => {
        const q1Cell = row.getCell(colIndex++);
        q1Cell.value = Math.round(subjectGrade.trimesters.Q1.total);
        if (Math.round(subjectGrade.trimesters.Q1.total) < 51) {
          q1Cell.font = { color: { argb: "FFFF0000" } }; // Rojo para reprobado
        }

        const q2Cell = row.getCell(colIndex++);
        q2Cell.value = Math.round(subjectGrade.trimesters.Q2.total);
        if (Math.round(subjectGrade.trimesters.Q2.total) < 51) {
          q2Cell.font = { color: { argb: "FFFF0000" } };
        }

        const q3Cell = row.getCell(colIndex++);
        q3Cell.value = Math.round(subjectGrade.trimesters.Q3.total);
        if (Math.round(subjectGrade.trimesters.Q3.total) < 51) {
          q3Cell.font = { color: { argb: "FFFF0000" } };
        }

        const prCell = row.getCell(colIndex++);
        prCell.value = Math.round(subjectGrade.finalAverage);
        if (Math.round(subjectGrade.finalAverage) < 51) {
          prCell.font = { color: { argb: "FFFF0000" } };
        }
      });

      // Promedio final y situación
      const promedioFinalCell = row.getCell(colIndex++);
      promedioFinalCell.value = Math.round(studentData.finalAverage);
      promedioFinalCell.font = { bold: true };

      const statusCell = row.getCell(colIndex++);
      statusCell.value = studentData.status;
      statusCell.font = {
        bold: true,
        color: {
          argb: studentData.status === "APROBADO" ? "FF008000" : "FFFF0000",
        },
      };

      // Aplicar colores de fila alterna y bordes
      const rowBgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8F8FF"; // Alice blue alterno
      for (let i = 1; i <= totalColumns; i++) {
        const cell = row.getCell(i);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBgColor },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (i > 2) { // Centrar desde la columna 3 en adelante
          cell.alignment = { horizontal: "center" };
        }
      }
    });

    // Ajustar ancho de columnas
    worksheet.getColumn(1).width = 6; // N°
    worksheet.getColumn(2).width = 30; // APELLIDOS Y NOMBRES

    // Columnas de materias
    for (let i = 3; i <= 2 + assignments.length * 4; i++) {
      worksheet.getColumn(i).width = 10;
    }

    // Columnas finales
    worksheet.getColumn(totalColumns - 1).width = 18; // PROMEDIO FINAL
    worksheet.getColumn(totalColumns).width = 15; // SITUACIÓN
  }

  private generateCentralizadorFileName(course: any, management: any): string {
    const courseName = course?.course?.replace(/\s+/g, "_") || "curso";
    const managementYear = management?.management || "gestion";
    const dateStr = new Date().toISOString().split("T")[0];

    return `centralizador_anual_${courseName}_${managementYear}_${dateStr}.xlsx`;
  }

  private async uploadCentralizadorToFirebase(
    buffer: ArrayBuffer,
    fileName: string
  ): Promise<string> {
    try {
      const storageRef = ref(this.storage, `reports/centralizador/${fileName}`);
      const snapshot = await uploadBytes(storageRef, new Uint8Array(buffer));
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading centralizador to Firebase:", error);
      throw new Error("Error al subir el reporte centralizador a Firebase");
    }
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

  // ================= BOLETINES =================

  async generateBoletin(
    courseId: number,
    managementId: number,
    studentId?: number,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    try {
      console.log("🎯 Generando boletín:", {
        courseId,
        managementId,
        studentId,
        trimester,
      });

      // Obtener información del curso y gestión
      const course = await this.db.course.findUnique({
        where: { id: courseId },
      });

      const management = await this.db.management.findUnique({
        where: { id: managementId },
      });

      if (!course || !management) {
        throw new Error("Curso o gestión no encontrados");
      }

      // Obtener estudiantes (uno específico o todos) a través de Registration
      const whereClause: any = {
        registrations: {
          some: {
            course_id: courseId,
            management_id: managementId,
          },
        },
      };

      if (studentId) {
        whereClause.id = studentId;
      }

      const students = await this.db.student.findMany({
        where: whereClause,
        include: {
          person: true,
        },
        orderBy: {
          person: {
            lastname: "asc",
          },
        },
      });

      if (students.length === 0) {
        throw new Error("No se encontraron estudiantes");
      }

      // Obtener materias del curso a través de Assignment
      const assignments = await this.db.assignment.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
        },
        include: {
          subject: true,
          professor: {
            include: {
              person: true,
            },
          },
        },
        orderBy: {
          subject: {
            subject: "asc",
          },
        },
      });

      if (assignments.length === 0) {
        throw new Error("No se encontraron materias asignadas al curso");
      }

      // Generar PDF único con todos los boletines
      console.log(`📝 Generando boletines para ${students.length} estudiantes`);

      // Calcular notas para todos los estudiantes
      const allStudentGrades = [];
      for (const student of students) {
        const studentGrades = await this.calculateStudentGradesForBoletin(
          student.id,
          assignments,
          trimester
        );
        allStudentGrades.push({
          student,
          grades: studentGrades,
        });
      }

      // Generar PDF único con todos los boletines
      const pdfBuffer = await this.generateAllBoletinesPDF(
        allStudentGrades,
        assignments,
        course,
        management,
        trimester
      );

      // Subir a Firebase
      const fileName = `boletines_curso_${course.course}_${
        trimester || "ANUAL"
      }_${management.management}_${Date.now()}.pdf`;
      const downloadUrl = await this.uploadBoletinToFirebase(
        pdfBuffer,
        fileName
      );

      return {
        ok: true,
        boletines: [
          {
            courseId: course.id,
            courseName: course.course,
            downloadUrl,
            fileName,
            totalStudents: students.length,
          },
        ],
        totalStudents: students.length,
        reportInfo: {
          course: course.course,
          management: management.management,
          trimester: trimester || "ANUAL",
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("❌ Error generando boletín:", error);
      throw error;
    }
  }

  private async calculateStudentGradesForBoletin(
    studentId: number,
    assignments: any[],
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    const studentGrades = [];

    // Obtener dimensiones para el cálculo de notas
    const dimensions = await this.db.dimension.findMany();

    for (const assignment of assignments) {
      console.log(
        `📚 Calculando notas para materia: ${assignment.subject.subject}`
      );

      const subjectGrades = {
        assignment,
        trimesters: {
          Q1: {
            saber: 0,
            hacer: 0,
            ser: 0,
            decidir: 0,
            autoevaluacion: 0,
            total: 0,
          },
          Q2: {
            saber: 0,
            hacer: 0,
            ser: 0,
            decidir: 0,
            autoevaluacion: 0,
            total: 0,
          },
          Q3: {
            saber: 0,
            hacer: 0,
            ser: 0,
            decidir: 0,
            autoevaluacion: 0,
            total: 0,
          },
        },
        finalAverage: 0,
      };

      // Calcular notas por trimestre usando la misma lógica del centralizador
      for (const quarter of ["Q1", "Q2", "Q3"]) {
        const trimesterGrades = await this.calculateTrimesterGrades(
          studentId,
          assignment.subject_id,
          assignment.management_id,
          quarter,
          dimensions
        );
        subjectGrades.trimesters[quarter] = trimesterGrades;
      }

      // Calcular promedio final de la materia
      const totalTrimesters = Object.values(subjectGrades.trimesters);
      subjectGrades.finalAverage =
        totalTrimesters.reduce((sum, t: any) => sum + t.total, 0) /
        totalTrimesters.length;

      console.log(
        `📊 Promedio final de ${assignment.subject.subject}: ${subjectGrades.finalAverage}`
      );

      studentGrades.push(subjectGrades);
    }

    return studentGrades;
  }

  private async generateAllBoletinesPDF(
    allStudentGrades: any[],
    assignments: any[],
    course: any,
    management: any,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Configurar fuente
    doc.setFont("helvetica");

    let isFirstPage = true;
    let boletinesInCurrentPage = 0;

    // Generar boletín para cada estudiante
    for (let i = 0; i < allStudentGrades.length; i++) {
      const { student, grades } = allStudentGrades[i];

      // Agregar nueva página si ya hay 2 boletines en la página actual
      if (boletinesInCurrentPage >= 2) {
        doc.addPage();
        boletinesInCurrentPage = 0;
      }

      // Si no es el primer boletín y es el segundo en la página, agregar espacio
      if (boletinesInCurrentPage === 1) {
        // El segundo boletín comenzará más abajo en la página
        // Se ajustará automáticamente con startY en setupIndividualBoletin
      }

      isFirstPage = false;

      // Generar boletín individual
      this.setupIndividualBoletin(
        doc,
        student,
        grades,
        course,
        management,
        trimester,
        boletinesInCurrentPage, // Pasamos la posición en la página
        i + 1 // Número del estudiante (1, 2, 3...)
      );

      // Verificar si el boletín es muy largo y evitar sobreposición
      const finalY = (doc as any).lastAutoTable.finalY;
      if (boletinesInCurrentPage === 0 && finalY > 120) {
        // Si el primer boletín es muy largo, agregar nueva página para el siguiente
        doc.addPage();
        boletinesInCurrentPage = 0; // Reset para que el siguiente sea el primero en la nueva página
      } else {
        boletinesInCurrentPage++;
      }
    }

    // Convertir a buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return pdfBuffer;
  }

  private setupIndividualBoletin(
    doc: jsPDF,
    student: any,
    studentGrades: any[],
    course: any,
    management: any,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL",
    positionInPage: number = 0,
    studentNumber: number = 1
  ) {
    // Crear una tabla completa que incluya todo el boletín
    this.createCompleteBoletinTable(
      doc,
      student,
      studentGrades,
      course,
      management,
      trimester,
      positionInPage,
      studentNumber
    );
  }

  private createCompleteBoletinTable(
    doc: jsPDF,
    student: any,
    studentGrades: any[],
    course: any,
    management: any,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL",
    positionInPage: number = 0,
    studentNumber: number = 1
  ) {
    // Calcular posición Y inicial basada en la posición en la página
    const startY = positionInPage === 0 ? 25 : 150; // Primera posición: 25mm, segunda: 150mm

    // Calcular promedios
    const totalQ1 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q1.total, 0) /
      studentGrades.length;
    const totalQ2 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q2.total, 0) /
      studentGrades.length;
    const totalQ3 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q3.total, 0) /
      studentGrades.length;
    const promedioGeneral = (totalQ1 + totalQ2 + totalQ3) / 3;

    // Calcular áreas reprobadas por trimestre
    const areasReprobadasQ1 = studentGrades.filter(
      (sg) => sg.trimesters.Q1.total < 51
    ).length;
    const areasReprobadasQ2 = studentGrades.filter(
      (sg) => sg.trimesters.Q2.total < 51
    ).length;
    const areasReprobadasQ3 = studentGrades.filter(
      (sg) => sg.trimesters.Q3.total < 51
    ).length;

    // Crear tabla principal del boletín
    const tableData: any[] = [];

    // Fila 1: Título "BOLETÍN DE NOTAS" y gestión
    tableData.push([
      {
        content: "BOLETÍN DE NOTAS",
        colSpan: 4,
        styles: {
          fontSize: 14,
          fontStyle: "bold",
          halign: "center",
          fillColor: [70, 130, 180], // Steel blue para un look más profesional
          textColor: [255, 255, 255],
        },
      },
      {
        content: `GESTIÓN: ${management.management}`,
        styles: {
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          fillColor: [100, 149, 237], // Cornflower blue
          textColor: [255, 255, 255],
        },
      },
    ]);

    // Fila 2: Información del estudiante
    tableData.push([
      {
        content: "APELLIDOS Y NOMBRE(S)",
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "left",
          fillColor: [176, 196, 222], // Light steel blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: `${student.person.lastname} ${student.person.name}`,
        colSpan: 2,
        styles: { 
          fontSize: 9, 
          fontStyle: "bold", 
          halign: "left",
          fillColor: [255, 255, 255],
        },
      },
      {
        content: `CURSO: 5° "${course.course}" PRIMARIA`,
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          fillColor: [100, 149, 237], // Cornflower blue
          textColor: [255, 255, 255],
        },
      },
      {
        content: studentNumber.toString(),
        styles: {
          fontSize: 16,
          fontStyle: "bold",
          halign: "center",
          fillColor: [100, 149, 237], // Cornflower blue
          textColor: [255, 255, 255],
        },
      },
    ]);

    // Fila 3: Encabezado "ÁREAS CURRICULARES" y "VALORACIÓN CUANTITATIVA"
    tableData.push([
      {
        content: "ÁREAS CURRICULARES",
        styles: {
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          fillColor: [70, 130, 180], // Steel blue
          textColor: [255, 255, 255],
        },
      },
      {
        content: "VALORACIÓN CUANTITATIVA",
        colSpan: 4,
        styles: {
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          fillColor: [70, 130, 180], // Steel blue
          textColor: [255, 255, 255],
        },
      },
    ]);

    // Fila 4: Subencabezados de trimestres
    tableData.push([
      { 
        content: "", 
        styles: { 
          fillColor: [176, 196, 222], // Light steel blue
        } 
      },
      {
        content: "1° TRIM",
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          fillColor: [176, 196, 222], // Light steel blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: "2° TRIM",
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          fillColor: [176, 196, 222], // Light steel blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: "3° TRIM",
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          fillColor: [176, 196, 222], // Light steel blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: "PROMEDIO",
        styles: {
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          fillColor: [176, 196, 222], // Light steel blue
          textColor: [0, 0, 0],
        },
      },
    ]);

    // Agregar materias con colores para notas reprobadas
    studentGrades.forEach((subjectGrade, index) => {
      const q1Grade = Math.round(subjectGrade.trimesters.Q1.total);
      const q2Grade = Math.round(subjectGrade.trimesters.Q2.total);
      const q3Grade = Math.round(subjectGrade.trimesters.Q3.total);
      const finalGrade = Math.round(subjectGrade.finalAverage);

      const rowBgColor = index % 2 === 0 ? [255, 255, 255] : [248, 248, 255]; // Alice blue alterno

      tableData.push([
        {
          content: subjectGrade.assignment.subject.subject.toUpperCase(),
          styles: {
            halign: "left",
            fillColor: rowBgColor,
            textColor: [0, 0, 0],
          },
        },
        {
          content: q1Grade.toString(),
          styles: {
            halign: "center",
            fillColor: q1Grade < 51 ? [255, 235, 235] : rowBgColor, // Light pink for failed
            textColor: q1Grade < 51 ? [255, 0, 0] : [0, 0, 0],
          },
        },
        {
          content: q2Grade.toString(),
          styles: {
            halign: "center",
            fillColor: q2Grade < 51 ? [255, 235, 235] : rowBgColor, // Light pink for failed
            textColor: q2Grade < 51 ? [255, 0, 0] : [0, 0, 0],
          },
        },
        {
          content: q3Grade.toString(),
          styles: {
            halign: "center",
            fillColor: q3Grade < 51 ? [255, 235, 235] : rowBgColor, // Light pink for failed
            textColor: q3Grade < 51 ? [255, 0, 0] : [0, 0, 0],
          },
        },
        {
          content: finalGrade.toString(),
          styles: {
            halign: "center",
            fillColor: finalGrade < 51 ? [255, 235, 235] : rowBgColor, // Light pink for failed
            textColor: finalGrade < 51 ? [255, 0, 0] : [0, 0, 0],
          },
        },
      ]);
    });

    // Fila de promedio trimestral
    tableData.push([
      {
        content: "PROMEDIO TRIMESTRAL:",
        styles: { 
          fontStyle: "bold", 
          fillColor: [135, 206, 235], // Sky blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: Math.round(totalQ1).toString(),
        styles: {
          fontStyle: "bold",
          halign: "center",
          fillColor: [135, 206, 235], // Sky blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: Math.round(totalQ2).toString(),
        styles: {
          fontStyle: "bold",
          halign: "center",
          fillColor: [135, 206, 235], // Sky blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: Math.round(totalQ3).toString(),
        styles: {
          fontStyle: "bold",
          halign: "center",
          fillColor: [135, 206, 235], // Sky blue
          textColor: [0, 0, 0],
        },
      },
      {
        content: Math.round(promedioGeneral).toString(),
        styles: {
          fontStyle: "bold",
          halign: "center",
          fillColor: [135, 206, 235], // Sky blue
          textColor: [0, 0, 0],
        },
      },
    ]);

    // Fila de áreas reprobadas por trimestre
    tableData.push([
      { 
        content: "Total - Áreas Reprobadas", 
        styles: { 
          fontStyle: "bold",
          fillColor: [255, 228, 196], // Blanched almond para destacar
          textColor: [0, 0, 0],
        } 
      },
      {
        content: areasReprobadasQ1.toString(),
        styles: { 
          fontStyle: "bold", 
          halign: "center",
          fillColor: [255, 228, 196], // Blanched almond
          textColor: areasReprobadasQ1 > 0 ? [255, 0, 0] : [0, 0, 0],
        },
      },
      {
        content: areasReprobadasQ2.toString(),
        styles: { 
          fontStyle: "bold", 
          halign: "center",
          fillColor: [255, 228, 196], // Blanched almond
          textColor: areasReprobadasQ2 > 0 ? [255, 0, 0] : [0, 0, 0],
        },
      },
      {
        content: areasReprobadasQ3.toString(),
        styles: { 
          fontStyle: "bold", 
          halign: "center",
          fillColor: [255, 228, 196], // Blanched almond
          textColor: areasReprobadasQ3 > 0 ? [255, 0, 0] : [0, 0, 0],
        },
      },
      {
        content: "-",
        styles: { 
          fontStyle: "bold", 
          halign: "center",
          fillColor: [255, 228, 196], // Blanched almond
        },
      },
    ]);

    // Generar la tabla con anchos optimizados para A4
    autoTable(doc, {
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.7,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 60, halign: "left" },
        1: { cellWidth: 26 },
        2: { cellWidth: 26 },
        3: { cellWidth: 22 },
        4: { cellWidth: 26 },
      },
      margin: { left: 15, right: 15 },
      theme: "grid",
      tableWidth: "wrap",
      alternateRowStyles: {
        fillColor: [248, 248, 255], // Alice blue para filas alternas
      },
    });
  }

  private setupBoletinTableNew(
    doc: jsPDF,
    studentGrades: any[],
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    const startY = 115;

    // Preparar encabezados y datos de la tabla
    const headers = [
      "ÁREAS CURRICULARES",
      "1° TRIM",
      "2° TRIM",
      "3° TRIM",
      "PROMEDIO FINAL",
    ];
    const tableData: any[] = [];

    // Agregar datos de cada materia
    studentGrades.forEach((subjectGrade) => {
      const row = [
        subjectGrade.assignment.subject.subject.toUpperCase(),
        Math.round(subjectGrade.trimesters.Q1.total).toString(),
        Math.round(subjectGrade.trimesters.Q2.total).toString(),
        Math.round(subjectGrade.trimesters.Q3.total).toString(),
        Math.round(subjectGrade.finalAverage).toString(),
      ];
      tableData.push(row);
    });

    // Calcular promedios trimestrales
    const totalQ1 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q1.total, 0) /
      studentGrades.length;
    const totalQ2 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q2.total, 0) /
      studentGrades.length;
    const totalQ3 =
      studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q3.total, 0) /
      studentGrades.length;
    const promedioGeneral = (totalQ1 + totalQ2 + totalQ3) / 3;

    // Agregar fila de promedio trimestral
    tableData.push([
      "PROMEDIO TRIMESTRAL:",
      Math.round(totalQ1).toString(),
      Math.round(totalQ2).toString(),
      Math.round(totalQ3).toString(),
      Math.round(promedioGeneral).toString(),
    ]);

    // Generar tabla
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: "center",
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80, halign: "left" },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 20, right: 20 },
      // Estilo especial para la última fila (promedio)
      didParseCell: function (data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [220, 220, 220];
        }
      },
    });
  }

  private setupBoletinFooterNew(
    doc: jsPDF,
    studentGrades: any[],
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    // Calcular promedio final
    const promedioFinal =
      studentGrades.reduce((sum, sg) => sum + sg.finalAverage, 0) /
      studentGrades.length;

    // Calcular áreas reprobadas
    const areasReprobadas = studentGrades.filter(
      (sg) => sg.finalAverage < 51
    ).length;

    // Situación académica
    const situacion = promedioFinal >= 51 ? "APROBADO" : "REPROBADO";
    const colorSituacion = promedioFinal >= 51 ? [0, 128, 0] : [255, 0, 0];

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Total áreas reprobadas
    doc.setTextColor(0, 0, 0);
    doc.text(`Total - Áreas Reprobadas: ${areasReprobadas}`, 20, finalY);

    // Promedio final
    doc.text(`PROMEDIO FINAL: ${Math.round(promedioFinal)}`, 20, finalY + 15);

    // Situación
    doc.setTextColor(colorSituacion[0], colorSituacion[1], colorSituacion[2]);
    doc.text(`SITUACIÓN: ${situacion}`, 120, finalY + 15);

    // Restablecer color
    doc.setTextColor(0, 0, 0);

    // Fecha de generación
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const fecha = new Date().toLocaleDateString("es-ES");
    doc.text(`Generado el: ${fecha}`, 20, finalY + 35);
  }

  private async generateBoletinPDF(
    student: any,
    studentGrades: any[],
    assignments: any[],
    course: any,
    management: any,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Configurar fuente
    doc.setFont("helvetica");

    // Encabezado del boletín
    this.setupBoletinHeader(doc, student, course, management, trimester);

    // Tabla de materias y calificaciones
    this.setupBoletinTable(doc, studentGrades, trimester);

    // Promedio trimestral y observaciones
    this.setupBoletinFooter(doc, studentGrades, trimester);

    // Convertir a buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return pdfBuffer;
  }

  private setupBoletinHeader(
    doc: jsPDF,
    student: any,
    course: any,
    management: any,
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    // Título principal
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("BOLETÍN DE CALIFICACIONES", 105, 20, { align: "center" });

    // Información del estudiante
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Nombre del estudiante
    doc.text("APELLIDOS Y NOMBRE(S):", 20, 40);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.person.lastname} ${student.person.name}`, 20, 50);

    // Curso y trimestre
    doc.setFont("helvetica", "normal");
    doc.text("CURSO:", 140, 40);
    doc.setFont("helvetica", "bold");
    doc.text(`5° "${course.course}"`, 140, 50);
    doc.text("PRIMARIA", 140, 58);

    // Período
    const trimesterText =
      trimester === "ANUAL"
        ? "ANUAL"
        : trimester === "Q1"
        ? "1° TRIM"
        : trimester === "Q2"
        ? "2° TRIM"
        : "3° TRIM";

    doc.setFont("helvetica", "normal");
    doc.text("PERÍODO:", 140, 70);
    doc.setFont("helvetica", "bold");
    doc.text(trimesterText, 140, 78);

    // Gestión
    doc.setFont("helvetica", "normal");
    doc.text("GESTIÓN:", 140, 90);
    doc.setFont("helvetica", "bold");
    doc.text(management.management.toString(), 140, 98);
  }

  private setupBoletinTable(
    doc: jsPDF,
    studentGrades: any[],
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    const startY = 115;

    // Preparar datos de la tabla
    const headers = ["ÁREAS CURRICULARES"];
    const columnStyles: any = { 0: { cellWidth: 120 } };

    if (trimester === "ANUAL") {
      headers.push("1° TRIM", "2° TRIM", "3° TRIM", "PROMEDIO ANUAL");
      columnStyles[1] = { cellWidth: 20 };
      columnStyles[2] = { cellWidth: 20 };
      columnStyles[3] = { cellWidth: 20 };
      columnStyles[4] = { cellWidth: 25 };
    } else {
      headers.push("VALORACIÓN CUANTITATIVA");
      columnStyles[1] = { cellWidth: 65 };
    }

    const tableData: any[] = [];

    // Agregar materias
    studentGrades.forEach((subjectGrade) => {
      const row = [subjectGrade.assignment.subject.subject.toUpperCase()];

      if (trimester === "ANUAL") {
        row.push(
          Math.round(subjectGrade.trimesters.Q1.total).toString(),
          Math.round(subjectGrade.trimesters.Q2.total).toString(),
          Math.round(subjectGrade.trimesters.Q3.total).toString(),
          Math.round(subjectGrade.finalAverage).toString()
        );
      } else {
        const trimesterGrade = trimester
          ? subjectGrade.trimesters[trimester].total
          : 0;
        row.push(Math.round(trimesterGrade).toString());
      }

      tableData.push(row);
    });

    // Calcular promedio trimestral
    let promedioTotal = 0;
    if (trimester === "ANUAL") {
      const totalQ1 =
        studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q1.total, 0) /
        studentGrades.length;
      const totalQ2 =
        studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q2.total, 0) /
        studentGrades.length;
      const totalQ3 =
        studentGrades.reduce((sum, sg) => sum + sg.trimesters.Q3.total, 0) /
        studentGrades.length;
      const promedioAnual = (totalQ1 + totalQ2 + totalQ3) / 3;

      tableData.push([
        "PROMEDIO TRIMESTRAL:",
        Math.round(totalQ1).toString(),
        Math.round(totalQ2).toString(),
        Math.round(totalQ3).toString(),
        Math.round(promedioAnual).toString(),
      ]);
      promedioTotal = promedioAnual;
    } else {
      const promedioTrimestre =
        studentGrades.reduce((sum, sg) => {
          const grade = trimester ? sg.trimesters[trimester].total : 0;
          return sum + grade;
        }, 0) / studentGrades.length;

      tableData.push([
        "PROMEDIO TRIMESTRAL:",
        Math.round(promedioTrimestre).toString(),
      ]);
      promedioTotal = promedioTrimestre;
    }

    // Agregar fila de áreas reprobadas
    const areasReprobadas = studentGrades.filter((sg) => {
      if (trimester === "ANUAL") {
        return sg.finalAverage < 51;
      } else {
        const grade = trimester ? sg.trimesters[trimester].total : 0;
        return grade < 51;
      }
    }).length;

    if (trimester === "ANUAL") {
      tableData.push([
        "Total - Áreas Reprobadas",
        areasReprobadas.toString(),
        "",
        "",
        "",
      ]);
    } else {
      tableData.push(["Total - Áreas Reprobadas", areasReprobadas.toString()]);
    }

    // Generar tabla
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: "center",
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 20, right: 20 },
    });
  }

  private setupBoletinFooter(
    doc: jsPDF,
    studentGrades: any[],
    trimester?: "Q1" | "Q2" | "Q3" | "ANUAL"
  ) {
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    // Calcular promedio final
    let promedioFinal = 0;
    if (trimester === "ANUAL") {
      promedioFinal =
        studentGrades.reduce((sum, sg) => sum + sg.finalAverage, 0) /
        studentGrades.length;
    } else {
      promedioFinal =
        studentGrades.reduce((sum, sg) => {
          const grade = trimester ? sg.trimesters[trimester].total : 0;
          return sum + grade;
        }, 0) / studentGrades.length;
    }

    // Situación académica
    const situacion = promedioFinal >= 51 ? "APROBADO" : "REPROBADO";
    const colorSituacion = promedioFinal >= 51 ? [0, 128, 0] : [255, 0, 0];

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`PROMEDIO FINAL: ${Math.round(promedioFinal)}`, 20, finalY);

    doc.setTextColor(colorSituacion[0], colorSituacion[1], colorSituacion[2]);
    doc.text(`SITUACIÓN: ${situacion}`, 120, finalY);

    // Restablecer color
    doc.setTextColor(0, 0, 0);

    // Fecha de generación
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const fecha = new Date().toLocaleDateString("es-ES");
    doc.text(`Generado el: ${fecha}`, 20, finalY);
  }

  private async uploadBoletinToFirebase(
    buffer: Buffer,
    fileName: string
  ): Promise<string> {
    try {
      const storageRef = ref(this.storage, `reports/boletines/${fileName}`);
      const snapshot = await uploadBytes(storageRef, buffer);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading boletin to Firebase:", error);
      throw new Error("Error al subir el boletín a Firebase");
    }
  }
}