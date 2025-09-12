import { Request, Response } from 'express';
import { SubjectService } from '../services/subject.service';

export class SubjectController {
  private subjectService = new SubjectService();

  // Obtener todas las materias
  async getAllSubjects(req: Request, res: Response) {
    try {
      const subjects = await this.subjectService.getAllSubjects();
      res.status(200).json(subjects);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Crear una nueva materia
  async createSubject(req: Request, res: Response) {
    try {
      const { name, created_by } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'El nombre de la materia es obligatorio.' });
      }

      const subject = await this.subjectService.createSubject({ name, created_by });
      res.status(201).json(subject);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Eliminar una materia por ID
  async deleteSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { deleted_by } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: 'El ID de la materia es obligatorio y debe ser un número.' });
      }

      await this.subjectService.deleteSubject(Number(id), deleted_by);
      res.status(200).json({ message: 'Materia eliminada exitosamente.' });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Manejo de errores
  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}