import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
            appId: process.env.FIREBASE_APP_ID
        };

        const app = initializeApp(firebaseConfig);
        this.storage = getStorage(app);
    }

    async generateAttendanceReport(courseId: number, subjectId: number, professorId: number, managementId: number, startDate?: string, endDate?: string) {
        try {
            // 1. Obtener información básica
            const [course, subject, professor, management] = await Promise.all([
                this.getCourseInfo(courseId),
                this.getSubjectInfo(subjectId),
                this.getProfessorInfo(professorId),
                this.getManagementInfo(managementId)
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
                // Si hay datos pero no se especificaron fechas, usar el rango de los datos
                const dates = attendanceData.map(att => att.attendance_date).filter(Boolean);
                reportStartDate = new Date(Math.min(...dates.map(d => d.getTime())));
                reportEndDate = new Date(Math.max(...dates.map(d => d.getTime())));
            }
            // Si no hay fechas ni datos, processAttendanceData manejará el caso por defecto

            // 5. Procesar datos para el Excel
            const processedData = this.processAttendanceDataWithDates(students, attendanceData, reportStartDate, reportEndDate);

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
            const fileName = this.generateFileName(course, subject, professor, management);
            const downloadUrl = await this.uploadToFirebase(new Uint8Array(excelBuffer), fileName);

            return {
                ok: true,
                downloadUrl,
                fileName,
                totalStudents: students.length,
                reportPeriod: {
                    startDate: startDate || 'Febrero',
                    endDate: endDate || 'Diciembre'
                }
            };

        } catch (error) {
            console.error('Error generating attendance report:', error);
            throw new Error(`Error al generar el reporte de asistencia: ${error.message}`);
        }
    }

    private async getCourseInfo(courseId: number) {
        return await this.db.course.findUnique({
            where: { id: courseId },
            select: {
                id: true,
                course: true,
                parallel: true
            }
        });
    }

    private async getSubjectInfo(subjectId: number) {
        return await this.db.subject.findUnique({
            where: { id: subjectId },
            select: {
                id: true,
                subject: true
            }
        });
    }

    private async getProfessorInfo(professorId: number) {
        return await this.db.professor.findUnique({
            where: { id: professorId },
            include: {
                person: {
                    select: {
                        name: true,
                        lastname: true,
                        second_lastname: true
                    }
                }
            }
        });
    }

    private async getManagementInfo(managementId: number) {
        return await this.db.management.findUnique({
            where: { id: managementId },
            select: {
                id: true,
                management: true,
                start_date: true,
                end_date: true
            }
        });
    }

    private async getStudentsByCourse(courseId: number) {
        return await this.db.registration.findMany({
            where: { 
                course_id: courseId,
                status: 1,
            },
            include: {
                student: {
                    where: {
                        status: 1,
                    },
                    include: {
                        person: {
                            select: {
                                name: true,
                                lastname: true,
                                second_lastname: true,
                                ci: true
                            }
                        }
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
    }

    private async getAttendanceData(courseId: number, subjectId: number, professorId: number, managementId: number, startDate?: string, endDate?: string) {
        const whereClause: any = {
            course_id: courseId,
            subject_id: subjectId,
            professor_id: professorId,
            management_id: managementId
        };

        if (startDate && endDate) {
            whereClause.attendance_date = {
                gte: new Date(startDate + 'T00:00:00.000Z'),
                lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        console.log('Querying attendance with:', whereClause);

        // Verificar primero qué campos tiene AttendanceRecord
        const sampleRecord = await this.db.attendanceRecord.findFirst();
        console.log('Sample AttendanceRecord structure:', sampleRecord);

        const attendanceRecords = await this.db.attendance.findMany({
            where: {
                ...whereClause,
                status: 1,
            },
            include: {
                course: true,
                subject: true,
                professor: {
                    include: {
                        person: true
                    }
                },
                management: true
            },
            orderBy: [
                { attendance_date: 'asc' }
            ]
        });

        console.log('Raw attendance records:', attendanceRecords.length);
        if (attendanceRecords.length > 0) {
            console.log('First attendance record sample:', JSON.stringify(attendanceRecords[0], null, 2));
        }

        // Obtener los attendance records para cada attendance
        const attendanceWithRecords = await Promise.all(
            attendanceRecords.map(async (attendance) => {
                const records = await this.db.attendanceRecord.findMany({
                    where: {
                        attendance_id: attendance.id
                    }
                });

                console.log(`Attendance ${attendance.id} (${attendance.attendance_date}) has ${records.length} records:`, records);
                
                // Crear estructura compatible con el código existente
                const attendancesWithStatus = records.map(record => {
                    // Si AttendanceRecord no tiene status, por ahora usar 'P' por defecto
                    // Necesitarás revisar dónde está el status real en tu base de datos
                    return {
                        student_id: record.student_id,
                        status_attendance: 'P' // TEMPORAL - necesitas encontrar el campo real
                    };
                });

                return {
                    ...attendance,
                    attendances: attendancesWithStatus
                };
            })
        );

        return attendanceWithRecords;
    }

    private processAttendanceData(students: any[], attendanceData: any[]) {
        if (!students || students.length === 0) {
            // Aún necesitamos generar la estructura mensual para mostrar los encabezados
            const currentYear = new Date().getFullYear();
            const defaultStart = new Date(currentYear, 1, 1); // Febrero
            const defaultEnd = new Date(currentYear, 11, 31); // Diciembre
            const monthlyData = this.generateMonthlyStructure(defaultStart, defaultEnd);
            
            return {
                students: [],
                monthlyData: monthlyData,
                summary: {
                    totalStudents: 0,
                    totalClasses: 0,
                    overallAttendanceRate: '0'
                }
            };
        }

        // Crear mapa de asistencias por estudiante y fecha
        const attendanceMap = new Map();
        attendanceData.forEach(attendanceRecord => {
            const date = attendanceRecord.attendance_date?.toISOString().split('T')[0];
            if (date && attendanceRecord.attendances) {
                attendanceRecord.attendances.forEach((record: any) => {
                    const studentId = record.student_id;
                    const key = `${studentId}-${date}`;
                    attendanceMap.set(key, record.status_attendance);
                });
            }
        });

        // Determinar rango de fechas para la estructura mensual
        let structureStartDate: Date;
        let structureEndDate: Date;

        if (attendanceData.length > 0) {
            // Si hay datos de asistencia, usar sus fechas para determinar el rango
            const dates = attendanceData.map(att => att.attendance_date).filter(Boolean);
            structureStartDate = new Date(Math.min(...dates.map(d => d.getTime())));
            structureEndDate = new Date(Math.max(...dates.map(d => d.getTime())));
        } else {
            // Si no hay datos de asistencia, usar febrero a diciembre del año actual
            const currentYear = new Date().getFullYear();
            structureStartDate = new Date(currentYear, 1, 1); // Febrero
            structureEndDate = new Date(currentYear, 11, 31); // Diciembre
        }

        // Generar estructura mensual
        const monthlyData = this.generateMonthlyStructure(structureStartDate, structureEndDate);

        // Procesar datos de estudiantes
        const processedStudents = students.map(registration => {
            const student = registration.student;
            const studentMonthlyAttendance = monthlyData.map(month => {
                const monthAttendances = month.workingDays.map(day => {
                    if (day.date) {
                        const key = `${student.id}-${day.date}`;
                        return attendanceMap.get(key) || null;
                    }
                    return null;
                });

                // Calcular estadísticas del mes
                const presentCount = monthAttendances.filter(att => att === 'Presente').length;
                const absentCount = monthAttendances.filter(att => att === 'Ausente').length;
                const lateCount = monthAttendances.filter(att => att === 'Tardanza').length;
                const totalDaysWithData = monthAttendances.filter(att => att !== null).length;

                return {
                    month: month.month,
                    year: month.year,
                    attendances: monthAttendances,
                    statistics: {
                        present: presentCount,
                        absent: absentCount,
                        late: lateCount,
                        totalDays: totalDaysWithData,
                        percentage: totalDaysWithData > 0 ? ((presentCount + lateCount) / totalDaysWithData * 100).toFixed(1) : '0'
                    }
                };
            });

            // Calcular estadísticas totales del estudiante
            const totalPresent = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.present, 0);
            const totalAbsent = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.absent, 0);
            const totalLate = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.late, 0);
            const totalDays = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.totalDays, 0);

            return {
                student: {
                    id: student.id,
                    fullName: `${student.person?.lastname || ''} ${student.person?.second_lastname || ''} ${student.person?.name || ''}`.trim(),
                    ci: student.person?.ci || 'Sin CI',
                    rude: student.rude || 'Sin RUDE'
                },
                monthlyAttendance: studentMonthlyAttendance,
                totalStatistics: {
                    present: totalPresent,
                    absent: totalAbsent,
                    late: totalLate,
                    totalDays: totalDays,
                    percentage: totalDays > 0 ? ((totalPresent + totalLate) / totalDays * 100).toFixed(1) : '0'
                }
            };
        });

        return {
            students: processedStudents,
            monthlyData: monthlyData,
            summary: {
                totalStudents: students.length,
                totalClasses: monthlyData.reduce((sum, month) => sum + month.workingDays.filter(day => day.date).length, 0),
                overallAttendanceRate: this.calculateOverallAttendanceRate(processedStudents)
            }
        };
    }

    private processAttendanceDataWithDates(students: any[], attendanceData: any[], startDate?: Date, endDate?: Date) {
        if (!students || students.length === 0) {
            const currentYear = new Date().getFullYear();
            const defaultStart = startDate || new Date(currentYear, 1, 1);
            const defaultEnd = endDate || new Date(currentYear, 11, 31);
            const monthlyData = this.generateMonthlyStructure(defaultStart, defaultEnd);
            
            return {
                students: [],
                monthlyData: monthlyData,
                summary: {
                    totalStudents: 0,
                    totalClasses: 0,
                    overallAttendanceRate: '0'
                }
            };
        }

        // Crear mapa de asistencias por estudiante y fecha
        const attendanceMap = new Map();
        
        console.log('Raw attendance data:', attendanceData.length); // Debug
        
        attendanceData.forEach((attendanceRecord, index) => {
            const date = attendanceRecord.attendance_date?.toISOString().split('T')[0];
            console.log(`Attendance record ${index}:`, {
                date,
                hasAttendances: !!attendanceRecord.attendances,
                attendancesCount: attendanceRecord.attendances?.length || 0
            }); // Debug
            
            if (date && attendanceRecord.attendances) {
                attendanceRecord.attendances.forEach((record: any) => {
                    const studentId = record.student_id;
                    const key = `${studentId}-${date}`;
                    console.log(`Setting attendance: ${key} = ${record.status_attendance}`); // Debug
                    attendanceMap.set(key, record.status_attendance);
                });
            }
        });

        console.log('Final attendance map size:', attendanceMap.size); // Debug
        console.log('Sample attendance entries:', Array.from(attendanceMap.entries()).slice(0, 10)); // Debug

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
        const monthlyData = this.generateMonthlyStructure(structureStartDate, structureEndDate);

        // Procesar datos de estudiantes
        const processedStudents = students.map(registration => {
            const student = registration.student;
            const studentMonthlyAttendance = monthlyData.map(month => {
                const monthAttendances = month.workingDays.map(day => {
                    if (day.date) {
                        const key = `${student.id}-${day.date}`;
                        const attendance = attendanceMap.get(key);
                        // Solo loggear para el primer estudiante para no saturar los logs
                        if (student.id === students[0]?.student?.id) {
                            console.log(`Student ${student.id}, Date ${day.date}, Key: ${key}, Attendance: ${attendance}`);
                        }
                        return attendance || null;
                    }
                    return null;
                });

                // Actualizar los contadores para los nuevos valores
                const presentCount = monthAttendances.filter(att => att === 'P').length;
                const absentCount = monthAttendances.filter(att => att === 'F').length;
                const licenseCount = monthAttendances.filter(att => att === 'L').length;
                const lateCount = monthAttendances.filter(att => att === 'T').length; // Por si hay tardanzas
                const totalDaysWithData = monthAttendances.filter(att => att !== null).length;

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
                        percentage: totalDaysWithData > 0 ? ((presentCount) / totalDaysWithData * 100).toFixed(1) : '0' // Solo presente cuenta para el porcentaje
                    }
                };
            });

            const totalPresent = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.present, 0);
            const totalAbsent = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.absent, 0);
            const totalLicense = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.license, 0);
            const totalLate = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.late, 0);
            const totalDays = studentMonthlyAttendance.reduce((sum, month) => sum + month.statistics.totalDays, 0);

            return {
                student: {
                    id: student.id,
                    fullName: `${student.person?.lastname || ''} ${student.person?.second_lastname || ''} ${student.person?.name || ''}`.trim(),
                    ci: student.person?.ci || 'Sin CI',
                    rude: student.rude || 'Sin RUDE'
                },
                monthlyAttendance: studentMonthlyAttendance,
                totalStatistics: {
                    present: totalPresent,
                    absent: totalAbsent,
                    license: totalLicense,
                    late: totalLate,
                    totalDays: totalDays,
                    percentage: totalDays > 0 ? ((totalPresent) / totalDays * 100).toFixed(1) : '0'
                }
            };
        });

        return {
            students: processedStudents,
            monthlyData: monthlyData,
            summary: {
                totalStudents: students.length,
                totalClasses: monthlyData.reduce((sum, month) => sum + month.workingDays.length, 0),
                overallAttendanceRate: this.calculateOverallAttendanceRate(processedStudents)
            }
        };
    }

    private generateMonthlyStructure(startDate: Date, endDate: Date) {
        const months = [];
        const monthNames = [
            'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
            'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
        ];
        
        let currentDate: Date;
        let finalDate: Date;

        // Determinar el rango de fechas
        const dates = [startDate, endDate].filter(Boolean);
        
        if (dates.length === 0) {
            // Si no hay fechas de asistencia, usar febrero a diciembre del año actual
            currentDate = new Date(new Date().getFullYear(), 1, 1); // Febrero (mes 1)
            finalDate = new Date(new Date().getFullYear(), 11, 31); // Diciembre (mes 11)
        } else if (dates.length === 1) {
            // Si solo hay una fecha, usar febrero a diciembre del año de esa fecha
            const year = dates[0].getFullYear();
            currentDate = new Date(year, 1, 1); // Febrero
            finalDate = new Date(year, 11, 31); // Diciembre
        } else {
            // Si hay rango de fechas específico, usar ese rango
            currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), 31);
        }

        // Generar meses en el rango
        while (currentDate <= finalDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Generar días hábiles del mes (L, M, X, J, V)
            const workingDays = this.getWorkingDaysOfMonth(year, month);
            
            months.push({
                month: monthNames[month],
                year: year,
                monthNumber: month + 1,
                workingDays: workingDays
            });

            // Avanzar al siguiente mes
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
        }

        return months;
    }

    private getWorkingDaysOfMonth(year: number, month: number) {
        const workingDays = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Obtener todos los días hábiles del mes en orden cronológico
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            
            // Solo días hábiles (Lunes a Viernes)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workingDays.push({
                    day: day,
                    date: date.toISOString().split('T')[0],
                    dayOfWeek: dayOfWeek,
                    dayLetter: ['L', 'M', 'X', 'J', 'V'][dayOfWeek - 1]
                });
            }
        }

        return workingDays;
    }

    private calculateOverallAttendanceRate(students: any[]): string {
        if (students.length === 0) return '0';
        
        const totalPercentage = students.reduce((sum, student) => 
            sum + parseFloat(student.totalStatistics.percentage), 0
        );
        
        return (totalPercentage / students.length).toFixed(1);
    }

    private async createAttendanceExcel(data: any, course: any, subject: any, professor: any, management: any, startDate?: string, endDate?: string) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Asistencia');

        // Estilo del encabezado principal
        this.addMainHeader(worksheet, course, subject, professor, management, startDate, endDate);

        // Crear estructura de columnas dinámicamente
        const columns = [
            { header: 'APELLIDOS Y NOMBRE(S)', key: 'fullName', width: 35 }
        ];

        // Contador para las claves de columnas
        let columnIndex = 0;

        // Agregar columnas para cada mes y sus días
        data.monthlyData.forEach((monthData: any) => {
            monthData.workingDays.forEach((day: any) => {
                columns.push({
                    header: day.dayLetter || 'L', // L, M, X, J, V
                    key: `day_${columnIndex}`,
                    width: 4
                });
                columnIndex++;
            });
        });

        worksheet.columns = columns;

        // Crear fila de encabezado de meses
        this.createMonthHeaders(worksheet, data.monthlyData);

        // Crear fila de números de días
        this.createDayNumbers(worksheet, data.monthlyData);

        // Agregar datos de estudiantes
        let currentRow = 10; // Después de los encabezados
        data.students.forEach((studentData: any, index: number) => {
            const rowData: any = {
                fullName: studentData.student.fullName
            };

            // Llenar datos de asistencia
            let dayColumnIndex = 0;
            data.monthlyData.forEach((monthData: any, monthIdx: number) => {
                const studentMonth = studentData.monthlyAttendance[monthIdx];
                
                monthData.workingDays.forEach((day: any, dayIdx: number) => {
                    const key = `day_${dayColumnIndex}`;
                    
                    if (studentMonth && studentMonth.attendances[dayIdx] !== undefined) {
                        const attendance = studentMonth.attendances[dayIdx];
                        rowData[key] = this.getAttendanceSymbol(attendance);
                    } else {
                        rowData[key] = '-';
                    }
                    
                    dayColumnIndex++;
                });
            });

            const row = worksheet.addRow(rowData);
            this.styleDataRowMonthly(row);
            currentRow++;
        });

        return await workbook.xlsx.writeBuffer();
    }

    private createMonthHeaders(worksheet: any, monthlyData: any[]) {
        const headerRow = worksheet.getRow(7);
        let colIndex = 2; // Empezar después de la columna de nombres

        monthlyData.forEach((monthData: any) => {
            const monthDays = monthData.workingDays.length;

            if (monthDays > 0) {
                // Combinar celdas para el nombre del mes
                const startCol = colIndex;
                const endCol = colIndex + monthDays - 1;
                
                if (startCol <= endCol) {
                    worksheet.mergeCells(headerRow.number, startCol, headerRow.number, endCol);
                    const cell = worksheet.getCell(headerRow.number, startCol);
                    cell.value = monthData.month;
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF4472C4' }
                    };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }

                colIndex += monthDays;
            }
        });
    }

    private createDayNumbers(worksheet: any, monthlyData: any[]) {
        const dayRow = worksheet.getRow(8);
        const dayLabelRow = worksheet.getRow(9);
        let colIndex = 2;

        monthlyData.forEach((monthData: any) => {
            monthData.workingDays.forEach((day: any) => {
                // Número del día
                const dayCell = dayRow.getCell(colIndex);
                dayCell.value = day.day || '';
                dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
                dayCell.font = { size: 8 };
                dayCell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Letra del día (L, M, X, J, V)
                const dayLabelCell = dayLabelRow.getCell(colIndex);
                dayLabelCell.value = day.dayLetter || 'L';
                dayLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                dayLabelCell.font = { bold: true, size: 8 };
                dayLabelCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE2EFDA' }
                };
                dayLabelCell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                colIndex++;
            });
        });
    }

    private styleDataRowMonthly(row: any) {
        row.height = 20;
        row.eachCell((cell: any, colNumber: number) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            
            if (colNumber === 1) { // Nombre del estudiante
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else { // Días de asistencia
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { bold: true, size: 9 };
            }
        });
    }

    private addMainHeader(worksheet: any, course: any, subject: any, professor: any, management: any, startDate?: string, endDate?: string) {
        // Insertar filas para el encabezado
        worksheet.insertRow(1, []);
        worksheet.insertRow(2, []);
        worksheet.insertRow(3, []);
        worksheet.insertRow(4, []);
        worksheet.insertRow(5, []);
        worksheet.insertRow(6, []);

        // Título principal
        worksheet.getCell('A1').value = 'REPORTE DE ASISTENCIA';
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // Información del reporte
        worksheet.getCell('A2').value = `Curso: ${course?.course || 'N/A'} - Paralelo: ${course?.parallel || 'N/A'}`;
        worksheet.getCell('A3').value = `Materia: ${subject?.subject || 'N/A'}`;
        worksheet.getCell('A4').value = `Profesor: ${professor?.person?.name || ''} ${professor?.person?.lastname || ''} ${professor?.person?.second_lastname || ''}`.trim();
        worksheet.getCell('A5').value = `Gestión: ${management?.management || 'N/A'}`;
        
        const period = startDate && endDate 
            ? `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
            : 'Gestión completa';
        worksheet.getCell('A6').value = `Período: ${period}`;

        // Estilo para la información
        for (let i = 2; i <= 6; i++) {
            worksheet.getCell(`A${i}`).font = { bold: true, size: 11 };
        }
    }

    private styleColumnHeaders(worksheet: any, headerRow: number, datesCount: number) {
        const headerRowObj = worksheet.getRow(headerRow);
        headerRowObj.height = 25;
        
        headerRowObj.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    private styleDataRow(row: any, datesCount: number) {
        row.height = 20;
        row.eachCell((cell: any, colNumber: number) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            
            // Alineación específica por tipo de columna
            if (colNumber === 1) { // Número
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber <= 4) { // CI, RUDE, Nombre
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (colNumber <= 4 + datesCount) { // Fechas de asistencia
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { bold: true };
            } else { // Estadísticas
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });
    }

    private addSummaryRow(worksheet: any, data: any) {
        const summaryRow = worksheet.addRow({
            number: '',
            ci: '',
            rude: '',
            fullName: 'RESUMEN GENERAL',
            present: data.students.reduce((sum: number, s: any) => sum + s.statistics.presentCount, 0),
            absent: data.students.reduce((sum: number, s: any) => sum + s.statistics.absentCount, 0),
            late: data.students.reduce((sum: number, s: any) => sum + s.statistics.lateCount, 0),
            percentage: `${data.summary.overallAttendanceRate}%`
        });

        // Estilo para fila de resumen
        summaryRow.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE2EFDA' }
            };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thick' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    private addLegend(worksheet: any) {
        const lastRow = worksheet.rowCount;
        
        worksheet.addRow([]);
        worksheet.addRow(['LEYENDA:']);
        worksheet.addRow(['P = Presente']);
        worksheet.addRow(['A = Ausente/Falta']);
        worksheet.addRow(['L = Licencia']);
        worksheet.addRow(['T = Tardanza']);
        worksheet.addRow(['- = No registrado']);

        // Estilo para la leyenda
        for (let i = lastRow + 2; i <= lastRow + 7; i++) {
            worksheet.getCell(`A${i}`).font = { bold: true, size: 10 };
        }
    }

    private getAttendanceSymbol(status: string | null): string {
        if (!status) return '-';
        
        switch (status.toUpperCase()) {
            case 'P': 
                return 'P'; // Presente
            case 'F': 
                return 'A'; // Falta -> Ausente
            case 'L': 
                return 'L'; // Licencia
            case 'T': 
                return 'T'; // Tardanza (si existe)
            default: 
                return '-';
        }
    }

    private formatDateForHeader(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit'
        });
    }

    private formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    private generateFileName(course: any, subject: any, professor: any, management: any): string {
        const courseName = course?.course?.replace(/\s+/g, '_') || 'curso';
        const subjectName = subject?.subject?.replace(/\s+/g, '_') || 'materia';
        const dateStr = new Date().toISOString().split('T')[0];
        
        return `reporte_asistencia_${courseName}_${subjectName}_${dateStr}.xlsx`;
    }

    private async uploadToFirebase(buffer: Uint8Array, fileName: string): Promise<string> {
        try {
            const storageRef = ref(this.storage, `reports/attendance/${fileName}`);
            const snapshot = await uploadBytes(storageRef, buffer);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading to Firebase:', error);
            throw new Error('Error al subir el archivo a Firebase');
        }
    }
}