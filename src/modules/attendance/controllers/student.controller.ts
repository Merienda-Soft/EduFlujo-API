import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';

export class StudentController {
    private service = new StudentService();

    async getStudentsByCourse(req: Request, res: Response) {
        try {
            const { courseId } = req.params;
            
            if (!courseId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requiere el ID del curso'
                });
            }

            const students = await this.service.getStudentsByCourse(Number(courseId));
            
            res.status(200).json({
                ok: true,
                data: students
            });
        } catch (error) {
            console.error('Error en getStudentsByCourse:', error);
            res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }
} 