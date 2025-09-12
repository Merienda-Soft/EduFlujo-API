import Database from '../../../shared/database/connection';
import { CreateAttendanceDto, CreateAttendanceRecordDto, RegisterAttendanceDto, UpdateAttendanceRecordDto, UpdateMultipleAttendanceRecordsDto } from '../dtos/attendance.dto';

export class AttendanceService {
    private db = Database.getInstance();

    // Crear un nuevo registro de asistencia
    async createAttendance(data: CreateAttendanceDto, created_by?: number) {
        return await this.db.attendance.create({
            data: {
                attendance_date: data.attendance_date,
                quarter: data.quarter,
                status: 1,
                created_by: created_by || null,
                management: {
                    connect: { id: data.management_id }
                },
                subject: {
                    connect: { id: data.subject_id }
                },
                professor: {
                    connect: { id: data.professor_id }
                },
                course: {
                    connect: { id: data.course_id }
                }
            }
        });
    }

    // Registrar la asistencia de un estudiante
    async createAttendanceRecord(data: CreateAttendanceRecordDto, created_by?: number) {
        return await this.db.attendanceRecord.create({
            data: {
                attendance: {
                    connect: { id: data.attendance_id }
                },
                student: {
                    connect: { id: data.student_id }
                },
                status_attendance: data.status_attendance,
                status: 1,
                created_by: created_by || null
            }
        });
    }

    // Registrar la asistencia de múltiples estudiantes a la vez
    async registerAttendance(data: RegisterAttendanceDto, created_by?: number) {
        return await this.db.$transaction(async (tx) => {
            // Crear el registro principal de asistencia
            const attendance = await tx.attendance.create({
                data: {
                    attendance_date: data.attendance.attendance_date,
                    quarter: data.attendance.quarter,
                    status: 1,
                    created_by: created_by || null,
                    management: {
                        connect: { id: data.attendance.management_id }
                    },
                    subject: {
                        connect: { id: data.attendance.subject_id }
                    },
                    professor: {
                        connect: { id: data.attendance.professor_id }
                    },
                    course: {
                        connect: { id: data.attendance.course_id }
                    }
                }
            });

            // Verificar si ya existen registros para evitar duplicados
            for (const record of data.records) {
                try {
                    await tx.attendanceRecord.create({
                        data: {
                            attendance: {
                                connect: { id: attendance.id }
                            },
                            student: {
                                connect: { id: record.student_id }
                            },
                            status_attendance: record.status_attendance,
                            status: 1,
                            created_by: created_by || null
                        }
                    });
                } catch (error) {
                    // Si ya existe un registro, actualizarlo
                    if (error.code === 'P2002') { // Código de error de Prisma para violación de restricción única
                        await tx.attendanceRecord.update({
                            where: {
                                attendance_id_student_id: {
                                    attendance_id: attendance.id,
                                    student_id: record.student_id
                                }
                            },
                            data: {
                                status_attendance: record.status_attendance,
                                updated_by: created_by || null
                            }
                        });
                    } else {
                        throw error;
                    }
                }
            }

            // Obtener los registros creados
            const attendanceRecords = await tx.attendanceRecord.findMany({
                where: {
                    attendance_id: attendance.id
                },
                include: {
                    student: {
                        include: {
                            person: true
                        }
                    }
                }
            });

            return {
                attendance,
                records: attendanceRecords
            };
        });
    }

    // Obtener asistencias por curso, materia y fecha
    async getAttendanceByCourseSubjectDate(courseId: number, subjectId: number, date: Date) {
        const attendance = await this.db.attendance.findFirst({
            where: {
                course_id: courseId,
                subject_id: subjectId,
                status: 1, // Solo registros activos
                attendance_date: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lt: new Date(date.setHours(23, 59, 59, 999))
                }
            },
            include: {
                attendances: {
                    include: {
                        student: {
                            include: {
                                person: true
                            }
                        }
                    }
                },
                course: true,
                subject: true,
                professor: {
                    include: {
                        person: true
                    }
                }
            }
        });

        if (!attendance) {
            return null;
        }

        // Formatear la respuesta
        return {
            id: attendance.id,
            attendance_date: attendance.attendance_date,
            quarter: attendance.quarter,
            course: attendance.course,
            subject: attendance.subject,
            professor: {
                id: attendance.professor?.id,
                name: attendance.professor?.person?.name,
                lastname: attendance.professor?.person?.lastname,
                second_lastname: attendance.professor?.person?.second_lastname
            },
            records: attendance.attendances.map(record => ({
                attendance_id: record.attendance_id,
                student_id: record.student_id,
                student_name: record.student?.person?.name,
                student_lastname: record.student?.person?.lastname,
                student_second_lastname: record.student?.person?.second_lastname,
                status: record.status_attendance
            }))
        };
    }

    // Obtener asistencias por curso y fecha
    async getAttendanceByCourseDate(courseId: number, date: Date) {
        const attendances = await this.db.attendance.findMany({
            where: {
                course_id: courseId,
                status: 1, // Solo registros activos
                attendance_date: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lt: new Date(date.setHours(23, 59, 59, 999))
                }
            },
            include: {
                subject: true,
                professor: {
                    include: {
                        person: true
                    }
                },
                attendances: {
                    include: {
                        student: {
                            include: {
                                person: true
                            }
                        }
                    }
                }
            }
        });

        // Formatear la respuesta
        return attendances.map(attendance => ({
            id: attendance.id,
            attendance_date: attendance.attendance_date,
            quarter: attendance.quarter,
            subject: attendance.subject,
            professor: {
                id: attendance.professor?.id,
                name: attendance.professor?.person?.name,
                lastname: attendance.professor?.person?.lastname,
                second_lastname: attendance.professor?.person?.second_lastname
            },
            records_count: attendance.attendances.length,
            absent_count: attendance.attendances.filter(r => r.status_attendance === 'A').length
        }));
    }

    // Actualizar el estado de asistencia de un estudiante
    async updateAttendanceRecord(attendanceId: number, studentId: number, data: UpdateAttendanceRecordDto, updated_by?: number) {
        // Con el nuevo esquema, podemos actualizar directamente usando la clave compuesta
        return await this.db.attendanceRecord.update({
            where: {
                attendance_id_student_id: {
                    attendance_id: attendanceId,
                    student_id: studentId
                }
            },
            data: {
                status_attendance: data.status_attendance,
                updated_by: updated_by || null
            }
        });
    }

    // Obtener el historial de asistencia de un estudiante
    async getStudentAttendanceHistory(studentId: number, courseId: number, subjectId: number) {
        const records = await this.db.attendanceRecord.findMany({
            where: {
                student_id: studentId,
                status: 1, // Solo registros activos
                attendance: {
                    course_id: courseId,
                    subject_id: subjectId,
                    status: 1 // Solo asistencias activas
                }
            },
            include: {
                attendance: true
            },
            orderBy: {
                attendance: {
                    attendance_date: 'desc'
                }
            }
        });

        return records.map(record => ({
            attendance_id: record.attendance_id,
            student_id: record.student_id,
            date: record.attendance?.attendance_date,
            status: record.status_attendance,
            quarter: record.attendance?.quarter
        }));
    }

    // Actualizar el estado de asistencia de múltiples estudiantes a la vez
    async updateMultipleAttendanceRecords(data: UpdateMultipleAttendanceRecordsDto, updated_by?: number) {
        return await this.db.$transaction(async (tx) => {
            const results = [];
            
            // Verificar que existe el registro de asistencia
            const attendance = await tx.attendance.findUnique({
                where: { id: data.attendance_id }
            });
            
            if (!attendance) {
                throw new Error(`Registro de asistencia con ID ${data.attendance_id} no encontrado`);
            }
            
            // Actualizar cada registro de estudiante
            for (const student of data.students) {
                try {
                    const updated = await tx.attendanceRecord.update({
                        where: {
                            attendance_id_student_id: {
                                attendance_id: data.attendance_id,
                                student_id: student.student_id
                            }
                        },
                        data: {
                            status_attendance: student.status_attendance,
                            updated_by: updated_by || null
                        }
                    });
                    
                    results.push({
                        attendance_id: updated.attendance_id,
                        student_id: updated.student_id,
                        status_attendance: updated.status_attendance,
                        updated: true
                    });
                } catch (error) {
                    // Si el registro no existe, lo registramos como no actualizado
                    results.push({
                        attendance_id: data.attendance_id,
                        student_id: student.student_id,
                        status_attendance: student.status_attendance,
                        updated: false,
                        error: `No se encontró el registro para el estudiante ${student.student_id}`
                    });
                }
            }
            
            return {
                attendance_id: data.attendance_id,
                total: data.students.length,
                updated: results.filter(r => r.updated).length,
                results: results
            };
        });
    }
}
