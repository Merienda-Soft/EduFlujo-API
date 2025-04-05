import { Request, Response } from 'express';
import { TasksService } from '../services/tasks.service';
import { createTaskWithAssignmentsSchema, gradeTaskSchema } from '../dtos/tasks.dto';
import { ZodError } from 'zod';

export class TasksController {
    private service = new TasksService();

    async create(req: Request, res: Response) {
        try {
            const data = createTaskWithAssignmentsSchema.parse(req.body);
            const result = await this.service.createTask(data);
            res.status(201).json(result);
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ error: error.errors });
            } else {
                this.handleError(res, error);
            }
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const result = await this.service.getAllTasks();
            res.status(200).json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.service.getTaskById(Number(id));
            result ? res.status(200).json(result) : res.status(404).json({ error: 'Tarea no encontrada' });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.service.updateTask(Number(id), req.body);
            res.status(200).json({ result, "ok": true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.service.deleteTask(Number(id));
            res.status(200).json({ message: 'Tarea eliminada exitosamente', "ok": true });
        } catch (error) {
            this.handleError(res, error);
            res.status(500).json({ message: 'Error al eliminar la tarea', "ok": false });
        }
    }

    async gradeTask(req: Request, res: Response) {
        try {
            const { taskId } = req.params;
            const data = gradeTaskSchema.parse(req.body);

            const result = await this.service.gradeTask(
                Number(taskId),
                data
            );

            res.status(200).json({result, "ok": true});
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ error: error.errors, ok: false });
            } else {
                this.handleError(res, error);
            }
        }
    }

    async getTasksByStudent(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const result = await this.service.getTasksByStudent(Number(studentId));
            res.status(200).json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getTasksByProfessorCourseSubjectManagement(req: Request, res: Response) {
        try {
            const { professorId, courseId, subjectId, managementId } = req.params;
            const result = await this.service.getTasksByProfessorCourseSubjectManagement(Number(professorId), Number(courseId), Number(subjectId), Number(managementId));
            res.status(200).json(result);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getTaskByIdWithAssignments(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.service.getTaskById(Number(id));
            if (!result) {
                return res.status(404).json({ error: 'Tarea no encontrada', ok: false });
            }
            res.status(200).json({ 
                ok: true,
                task: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor', "ok": false });
    }
} 