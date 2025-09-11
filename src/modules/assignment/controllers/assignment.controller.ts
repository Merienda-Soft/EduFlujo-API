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
      const assignmentsData = req.body; 
      const created_by = req.body.created_by; 
      if (!Array.isArray(assignmentsData)) {
        return res.status(400).json({ message: 'Invalid request format. Expected an array of assignments.' });
      }

      const assignmentsWithAudit = assignmentsData.map(assignment => ({
        ...assignment,
        created_by: created_by
      }));
  
      const assignments = await this.assignmentService.createAssignments(assignmentsWithAudit);
      res.status(201).json(assignments);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateAssignments(req: Request, res: Response) {
    try {
      const updates = req.body.updates; // array of { assignmentId, newProfessorId }
      const updated_by = req.body.updated_by; 
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: 'Invalid request format. Expected an array of updates.' });
      }

      const updatesWithAudit = updates.map(update => ({
        ...update,
        updated_by: updated_by
      }));
  
      const updatedAssignments = await this.assignmentService.updateAssignmentsById(updatesWithAudit);
      res.status(200).json(updatedAssignments);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async reactivateAssignments(req: Request, res: Response) {
    try {
      const { courseId, professorId, updated_by } = req.body;
      const result = await this.assignmentService.reactivateAssignments(
        Number(courseId),
        Number(professorId),
        updated_by
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