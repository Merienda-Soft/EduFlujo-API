import Database from '../../../shared/database/connection';
import { CreateTaskWithAssignmentsDto, TaskAssignmentDto } from '../dtos/tasks.dto';

export class TasksService {
    private db = Database.getInstance();

    async createTask(data: CreateTaskWithAssignmentsDto) {
        const { task, assignments } = data;

        return await this.db.$transaction(async (tx) => {
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
            const assignmentPromises = assignments.map(assignment =>
                tx.taskAssignment.create({
                    data: {
                        task_id: createdTask.id,
                        student_id: assignment.student_id,
                        assigned_date: new Date()
                    }
                })
            );

            await Promise.all(assignmentPromises);

            return await tx.task.findUnique({
                where: { id: createdTask.id },
                include: {
                    assignments: true,
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
            where: { id },
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
        // Primero eliminar las asignaciones
        await this.db.taskAssignment.deleteMany({
            where: { task_id: id }
        });

        // Luego eliminar la tarea
        return await this.db.task.delete({
            where: { id }
        });
    }

    async gradeTask(taskId: number, studentId: number, qualification: string) {
        return await this.db.taskAssignment.update({
            where: {
                task_id_student_id: {
                    task_id: taskId,
                    student_id: studentId
                }
            },
            data: {
                qualification,
                completed_date: new Date()
            }
        });
    }

    async getTasksByStudent(studentId: number) {
        return await this.db.task.findMany({
            where: {
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
                dimension: true
            }
        });
    }

    async getTasksByProfessor(professorId: number) {
        return await this.db.task.findMany({
            where: {
                professor_id: professorId
            },
            include: {
                assignments: true,
                subject: true,
                dimension: true
            }
        });
    }
}