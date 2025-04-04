import Database from '../../../shared/database/connection';

export class ProfessorService {
    private db = Database.getInstance();

    async getProfessorByEmail(email: string) {
        return await this.db.professor.findFirst({
            where: {
                person: {
                    email: email
                }
            },
            include: {
                person: true
            }
        });
    }
}
