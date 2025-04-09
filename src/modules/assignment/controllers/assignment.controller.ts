import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignment.service';

export class AssignmentController {
  private assignmentService = new AssignmentService();

  async getAssignmentsByCourse(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const assignments = await this.assignmentService.getAssignmentsByCourse(Number(courseId));
      res.status(200).json(assignments);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createAssignments(req: Request, res: Response) {
    try {
      const { courseId, generalAssignments, technicalAssignments } = req.body;
      const assignments = await this.assignmentService.createAssignments(
        Number(courseId),
        generalAssignments,
        technicalAssignments
      );
      res.status(201).json(assignments);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateAssignments(req: Request, res: Response) {
    try {
      const { courseId, oldProfessorId, newProfessorId, subjectId, value } = req.body;
      const updatedAssignments = await this.assignmentService.updateAssignments(
        Number(courseId),
        [{ oldProfessorId, newProfessorId, subjectId }],
        Number(value)
      );
      res.status(200).json(updatedAssignments);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async reactivateAssignments(req: Request, res: Response) {
    try {
      const { courseId, professorId } = req.body;
      const result = await this.assignmentService.reactivateAssignments(
        Number(courseId),
        Number(professorId)
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}