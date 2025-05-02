import { Request, Response } from 'express';
import { ManagementService } from '../services/management.service';
import { EnvironmentService } from '../services/environment.service';
import { 
  createManagementSchema, 
} from '../dtos/management.dto';

export class ManagementController {
  private managementService = new ManagementService();
  private environmentService = new EnvironmentService();

  async getAll(req: Request, res: Response) {
    try {
      const result = await this.managementService.getAllManagements();
      
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getActive(req: Request, res: Response) {
    try {
      const result = await this.managementService.getActiveManagements();
      const simplifiedResults = result.map(item => ({
        id: item.id,
        management: item.management,
      }));
      
      res.status(200).json(simplifiedResults);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getDegree(req: Request, res: Response) {
    try {
      const result = await this.managementService.getAllDegree();
      const simplifiedResults = result.map(item => ({
        id: item.id,
        degree: item.degree,
      }));
      
      res.status(200).json(simplifiedResults);
    } catch (error) {
      this.handleError(res, error);
    }
  }


  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.managementService.getManagementById(Number(id));
      result ? res.status(200).json(result) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.managementService.deactivateManagement(Number(id));
      res.status(200).json({ 
        message: 'Management deactivated successfully',
        status: 0
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createEnvironment(req: Request, res: Response) {
    try {
      const { managementData, gradeCourseData, subjectIds } = req.body;

      const result = await this.environmentService.CreateEnvironment(managementData, gradeCourseData, subjectIds);

      res.status(201).json({
        message: 'La gestion ha sido creada exitosamente',
        management: result,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async cloneAcademicStructure(req: Request, res: Response) {
    try {
        const { sourceManagementId, newManagementYear, quarterDates } = req.body;

        if (!sourceManagementId || !newManagementYear || !quarterDates) {
            return res.status(400).json({
                message: 'Se requieren los parámetros sourceManagementId, newManagementYear y quarterDates.',
            });
        }

        const result = await this.managementService.cloneAcademicStructure(
            Number(sourceManagementId),
            Number(newManagementYear),
            quarterDates
        );

        res.status(200).json(result);
    } catch (error) {
        this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}