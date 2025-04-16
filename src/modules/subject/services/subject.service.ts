import Database from '../../../shared/database/connection';

export class SubjectService {
  private db = Database.getInstance();

  // Obtener todas las materias
  async getAllSubjects() {
    return await this.db.subject.findMany();
  }

  // Crear una nueva materia
  async createSubject(subjectData: { name: string }) {
    return await this.db.subject.create({
      data: {
        subject: subjectData.name.trim(),
      },
    });
  }

  // Eliminar una materia por ID
  async deleteSubject(subjectId: number) {
    return await this.db.subject.delete({
      where: {
        id: subjectId,
      },
    });
  }
}