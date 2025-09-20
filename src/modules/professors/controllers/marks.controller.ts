import { Request, Response } from 'express';
import { MarksService } from '../services/marks.service';
import { CheckCoursesMarksDto } from '../dtos/marks.dto';

export class MarksController {
  private marksService: MarksService;

  constructor() {
    this.marksService = new MarksService();
  }

  /**
   * Calcular y guardar las notas finales anuales de todos los estudiantes de un curso
   * POST /professors/marks/calculate-final-marks
   * Body: { courseId: number, managementId: number }
   */
  async calculateFinalMarks(req: Request, res: Response) {
    try {
      const { courseId, managementId } = req.body;
      const userId = req.body.userId; // Opcional: ID del usuario que ejecuta la acción

      // Validaciones
      if (!courseId || !managementId) {
        return res.status(400).json({
          success: false,
          message: 'courseId y managementId son requeridos'
        });
      }

      if (typeof courseId !== 'number' || typeof managementId !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'courseId y managementId deben ser números'
        });
      }

      console.log(`🎯 Iniciando cálculo de notas finales - Curso: ${courseId}, Gestión: ${managementId}`);

      const result = await this.marksService.calculateAndSaveFinalMarks(
        courseId,
        managementId,
        userId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          courseId,
          managementId,
          studentsProcessed: result.data.length,
          executedAt: new Date().toISOString(),
          executedBy: userId
        }
      });

    } catch (error) {
      console.error('❌ Error en calculateFinalMarks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al calcular notas finales',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calcular y guardar las notas finales por materia específica de todos los estudiantes de un curso
   * POST /professors/marks/calculate-subject-marks
   * Body: { courseId: number, subjectId: number, managementId: number }
   */
  async calculateSubjectMarks(req: Request, res: Response) {
    try {
      const { courseId, subjectId, managementId } = req.body;
      const userId = req.body.userId; // Opcional: ID del usuario que ejecuta la acción

      // Validaciones
      if (!courseId || !subjectId || !managementId) {
        return res.status(400).json({
          success: false,
          message: 'courseId, subjectId y managementId son requeridos'
        });
      }

      if (
        typeof courseId !== 'number' ||
        typeof subjectId !== 'number' ||
        typeof managementId !== 'number'
      ) {
        return res.status(400).json({
          success: false,
          message: 'courseId, subjectId y managementId deben ser números'
        });
      }

      console.log(`🎯 Iniciando cálculo de notas por materia - Curso: ${courseId}, Materia: ${subjectId}, Gestión: ${managementId}`);

      const result = await this.marksService.calculateAndSaveSubjectMarks(
        courseId,
        subjectId,
        managementId,
        userId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          courseId,
          subjectId,
          managementId,
          studentsProcessed: result.data.length,
          executedAt: new Date().toISOString(),
          executedBy: userId
        }
      });

    } catch (error) {
      console.error('❌ Error en calculateSubjectMarks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al calcular notas por materia',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtener todas las notas finales de un curso
   * GET /professors/marks/final-marks/:courseId/:managementId
   */
  async getFinalMarks(req: Request, res: Response) {
    try {
      const courseId = parseInt(req.params.courseId);
      const managementId = parseInt(req.params.managementId);

      // Validaciones
      if (isNaN(courseId) || isNaN(managementId)) {
        return res.status(400).json({
          success: false,
          message: 'courseId y managementId deben ser números válidos'
        });
      }

      const result = await this.marksService.getFinalMarksByCourse(courseId, managementId);

      res.status(200).json({
        success: true,
        message: 'Notas finales obtenidas exitosamente',
        data: result.data,
        metadata: {
          courseId,
          managementId,
          totalStudents: result.data.length,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error en getFinalMarks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener notas finales',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtener todas las notas finales por materia de un curso
   * GET /professors/marks/subject-marks/:courseId/:subjectId/:managementId
   */
  async getSubjectMarks(req: Request, res: Response) {
    try {
      const courseId = parseInt(req.params.courseId);
      const subjectId = parseInt(req.params.subjectId);
      const managementId = parseInt(req.params.managementId);

      // Validaciones
      if (isNaN(courseId) || isNaN(subjectId) || isNaN(managementId)) {
        return res.status(400).json({
          success: false,
          message: 'courseId, subjectId y managementId deben ser números válidos'
        });
      }

      const result = await this.marksService.getSubjectMarksByCourse(courseId, subjectId, managementId);

      res.status(200).json({
        success: true,
        message: 'Notas por materia obtenidas exitosamente',
        data: result.data,
        metadata: {
          courseId,
          subjectId,
          managementId,
          totalStudents: result.data.length,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error en getSubjectMarks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener notas por materia',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  //Verificar si los cursos tienen registros en MarkSubject para todas sus materias
  async checkCoursesHaveMarks(req: Request, res: Response) {
    try {
      const { managementId } = req.body;

      // Validaciones
      if (!managementId) {
        return res.status(400).json({
          success: false,
          message: 'managementId es requerido'
        });
      }

      if (typeof managementId !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'managementId debe ser un número'
        });
      }

      console.log(`🔍 Verificando registros de cursos - Gestión: ${managementId}`);

      const result = await this.marksService.checkCoursesHaveMarks(managementId);

      res.status(200).json({
        success: true,
        message: 'Verificación completada exitosamente',
        data: result.data,
        is_checked: result.is_checked
      });

    } catch (error) {
      console.error('❌ Error en checkCoursesHaveMarks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al verificar registros de cursos',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Endpoint de prueba para verificar que el controlador funciona
   * GET /professors/marks/health
   */
  async healthCheck(req: Request, res: Response) {
    try {
      res.status(200).json({
        success: true,
        message: 'Marks Controller funcionando correctamente',
        service: 'MarksService',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en health check',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}