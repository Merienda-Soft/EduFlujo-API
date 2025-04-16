import Database from '../../../shared/database/connection';

export class ManagementService {
  async getAllManagements() {
    return await Database.getInstance().management.findMany();
  }

  async getActiveManagements() {
    return await Database.getInstance().management.findMany({
      where: {
        status: 1,
      },
    });
  }

  async getAllDegree() {
    return await Database.getInstance().degree.findMany();
  }

  async getManagementById(id: number) {
    return await Database.getInstance().management.findUnique({
      where: { id: id },
    });
  }

  async updateManagement(id: number, data: any) {
    return await Database.getInstance().management.update({
      where: { id: id },
      data,
    });
  }

  async deactivateManagement(id: number): Promise<void> {
    await Database.getInstance().management.update({
      where: { id: id },
      data: { status: 0 } 
    });
  }
}