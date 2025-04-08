import Database from '../../../shared/database/connection';
import { CreateTaskWithAssignmentsDto, TaskAssignmentDto, GradeTaskDto } from '../dtos/tasks.dto';

export class TasksService {
    private db = Database.getInstance();

    async createTask(data: CreateTaskWithAssignmentsDto) {
        const { task, assignments = [] } = data;

        return await this.db.$transaction(async (tx) => {
            // Si no hay assignments específicos, obtener todos los estudiantes del curso
            let studentsToAssign = assignments;
            
            if (assignments.length === 0) {
                const registrations = await tx.registration.findMany({
                    where: {
                        course_id: task.course_id,
                        management_id: task.management_id
                    },
                    select: {
                        student_id: true
                    }
                });
                studentsToAssign = registrations.map(reg => ({
                    student_id: reg.student_id,
                    assigned_date: new Date()
                }));
            }

            // Crear la tarea
            const createdTask = await tx.task.create({
                data: {
                    name: task.name,
                    description: task.description,
                    weight: task.weight,
                    is_autoevaluation: task.is_autoevaluation,
                    quarter: task.quarter,
                    start_date: task.start_date,
                    end_date: task.end_date,
                    create_date: new Date(),
                    last_update: new Date(),
                    type: task.type,
                    status: 1,
                    dimension: {
                        connect: { id: task.dimension_id }
                    },
                    management: {
                        connect: { id: task.management_id }
                    },
                    professor: {
                        connect: { id: task.professor_id }
                    },
                    subject: {
                        connect: { id: task.subject_id }
                    },
                    course: {
                        connect: { id: task.course_id }
                    }
                }
            });

            // Crear las asignaciones
            const assignmentPromises = studentsToAssign.map(student =>
                tx.taskAssignment.create({
                    data: {
                        task_id: createdTask.id,
                        student_id: student.student_id,
                        assigned_date: student.assigned_date
                    }
                })
            );

            await Promise.all(assignmentPromises);

            return await tx.task.findUnique({
                where: { id: createdTask.id },
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
                    professor: {
                        include: { person: true }
                    },
                    subject: true,
                    dimension: true,
                    course: true,
                    management: true
                }
            });
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
                        completed_date: new Date()
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
        return await this.db.task.findMany({
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
                dimension: true
            }
        });
    }
}