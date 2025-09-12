import Database from '../../../shared/database/connection';

export class SubjectService {
  private db = Database.getInstance();

  // Obtener todas las materias
  async getAllSubjects() {
    return await this.db.subject.findMany({
      where: {
        status: 1,
      },
    });
  }

  // Crear una nueva materia
  async createSubject(subjectData: { name: string; created_by?: number }) {
    return await this.db.subject.create({
      data: {
        subject: subjectData.name.trim(),
        status: 1,
        created_by: subjectData.created_by || null,
      },
    });
  }

  // Eliminar una materia por ID (soft delete)
  async deleteSubject(subjectId: number, deleted_by?: number) {
    return await this.db.subject.update({
      where: { id: subjectId },
      data: {
        status: 0,
        updated_by: deleted_by || null,
      },
    });
  }
}