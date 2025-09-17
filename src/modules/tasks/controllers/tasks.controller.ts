import { Request, Response } from 'express';
import { TasksService } from '../services/tasks.service';
import { createTaskWithAssignmentsSchema, gradeTaskSchema } from '../dtos/tasks.dto';
import { ZodError } from 'zod';
import path from 'path';

export class TasksController {
    private service = new TasksService();

    async create(req: Request, res: Response) {
        try {
            const data = createTaskWithAssignmentsSchema.parse(req.body);
            const { created_by } = req.body;
            
            const result = await this.service.createTask(data, created_by);
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
            const { updated_by } = req.body;
            const result = await this.service.updateTask(Number(id), req.body, updated_by);
            res.status(200).json({ result, "ok": true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deleted_by } = req.body;
            await this.service.deleteTask(Number(id), deleted_by);
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
            const { studentId, courseId, subjectId, managementId } = req.params;
            
            if (!studentId || !courseId || !subjectId || !managementId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren todos los parámetros: studentId, courseId, subjectId y managementId'
                });
            }

            const result = await this.service.getTasksByStudent(
                Number(studentId),
                Number(courseId),
                Number(subjectId),
                Number(managementId)
            );

            res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getTasksByProfessorCourseSubjectManagement(req: Request, res: Response) {
        try {
            const { professorId, courseId, subjectId, managementId } = req.params;
            const result = await this.service.getTasksByProfessorCourseSubjectManagement(Number(professorId), Number(courseId), Number(subjectId), Number(managementId));
            res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getTasksByCourseAndProfessor(req: Request, res: Response) {
        try {
            const { courseId, professorId, managementId } = req.params;
            const { download, quarter } = req.query;
            
            if (!courseId || !professorId || !managementId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren courseId, professorId y managementId'
                });
            }

            const result = await this.service.getTasksByCourseAndProfessor(
                Number(courseId),
                Number(professorId),
                Number(managementId)
            );

            // Si se solicita la descarga del Excel
            if (download === 'true') {
                try {
                    const reportUrls = await this.service.generateQuarterlyExcelFiles(
                        Number(courseId),
                        Number(professorId),
                        result
                    );

                    // Si se especifica un trimestre específico
                    if (quarter && ['1', '2', '3'].includes(quarter as string)) {
                        const quarterReport = reportUrls.find(r => r.quarter === Number(quarter));
                        if (!quarterReport) {
                            throw new Error(`No se encontró el reporte para el trimestre ${quarter}`);
                        }
                        return res.json({
                            ok: true,
                            downloadUrl: quarterReport.url,
                            fileName: quarterReport.fileName
                        });
                    }
                    
                    // Si no se especifica trimestre, enviar todas las URLs
                    return res.json({
                        ok: true,
                        reports: reportUrls
                    });
                } catch (error) {
                    console.error('Error generating reports:', error);
                    return res.status(500).json({
                        ok: false,
                        error: error.message || 'Error al generar los reportes'
                    });
                }
            }

            return res.json({
                ok: true,
                data: result
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                ok: false,
                error: error.message || 'Error al obtener las tareas'
            });
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

    async getTaskByIdAndStudentId(req: Request, res: Response) {
        try {
            const { taskId, studentId } = req.params;
            
            if (!taskId || !studentId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren el ID de la tarea y el ID del estudiante'
                });
            }

            const result = await this.service.getTaskByIdAndStudentId(
                Number(taskId),
                Number(studentId)
            );

            if (!result) {
                return res.status(404).json({
                    ok: false,
                    error: 'No se encontró la tarea o el estudiante no tiene acceso a ella'
                });
            }

            res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async submitTaskFiles(req: Request, res: Response) {
        try {
            const { taskId, studentId, files } = req.body;

            if (!taskId || !studentId || !files || !Array.isArray(files)) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren taskId, studentId y un array de archivos'
                });
            }

            const result = await this.service.submitTaskFiles(
                Number(taskId),
                Number(studentId),
                files
            );

            res.status(201).json({
                ok: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async cancelSubmitTaskFiles(req: Request, res: Response) {
        try {
            const { taskId, studentId } = req.body;

            if (!taskId || !studentId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren taskId y studentId'
                });
            }

            const result = await this.service.cancelSubmitTaskFiles(
                Number(taskId),
                Number(studentId)
            );

            res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getWeightByDate(req: Request, res: Response) {
        try {
            const { professorId, courseId, subjectId, managementId } = req.params;
            const { date } = req.query;

            // Validar parámetros requeridos
            if (!professorId || !courseId || !subjectId || !managementId || !date) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren todos los parámetros: professorId, courseId, subjectId, managementId y date'
                });
            }

            // Validar y convertir la fecha
            const requestDate = new Date(date as string);
            if (isNaN(requestDate.getTime())) {
                return res.status(400).json({
                    ok: false,
                    error: 'La fecha proporcionada no es válida. Use formato YYYY-MM-DD'
                });
            }

            const result = await this.service.getWeightMonthByDate(
                requestDate,
                Number(professorId),
                Number(courseId),
                Number(subjectId),
                Number(managementId)
            );

            res.status(200).json({
                ok: true,
                data: result
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