import Database from '../../../shared/database/connection';

export class ManagementService {
    private db = Database.getInstance();

    async getManagements() {
        return await this.db.management.findMany();
    }
}
