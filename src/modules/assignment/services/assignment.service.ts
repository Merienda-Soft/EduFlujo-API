import Database from '../../../shared/database/connection';

export class AssignmentService {

  async createAssignments(assignmentsData: { course_id: number; professor_id: number; management_id: number; subject_id: number; created_by?: number }[]) {
    const db = Database.getInstance();
    console.log("ASIGNACIONES", assignmentsData);
    return await db.$transaction(async (transaction) => {
      const assignments = [];
  
      for (const { course_id, professor_id, subject_id, management_id, created_by } of assignmentsData) {
        const assignment = await transaction.assignment.create({
          data: {
            course_id,
            professor_id,
            subject_id,
            management_id,
            status: 1,
            quarter: null,
            created_by: created_by || null,
          },
        });
        assignments.push(assignment);
      }
  
      return assignments;
    });
  }

  async updateAssignmentsById(
      updates: { assignmentId: number; newProfessorId: number; updated_by?: number }[]
    ) {
      const db = Database.getInstance();
    
      return await db.$transaction(async (transaction) => {
        const updatedAssignments = [];
    
        for (const { assignmentId, newProfessorId, updated_by } of updates) {
          // Fetch the current assignment by its ID
          const currentAssignment = await transaction.assignment.findUnique({
            where: { id: assignmentId },
            select: { professor_id: true },
          });
    
          if (currentAssignment?.professor_id === newProfessorId) {
            continue;
          }
    
          const updatedAssignment = await transaction.assignment.update({
            where: { id: assignmentId },
            data: { 
              professor_id: newProfessorId,
              updated_by: updated_by || null,
            },
          });
    
          updatedAssignments.push(updatedAssignment);
        }
    
        return updatedAssignments;
      });
  }

  async reactivateAssignments(courseId: number, professorId: number, updated_by?: number) {
    const db = Database.getInstance();
  
    return await db.$transaction(async (transaction) => {
      // Activate the assignments of the absent professor in the course
      await transaction.assignment.updateMany({
        where: {
          course_id: courseId,
          professor_id: professorId,
          status: 3,
        },
        data: {
          status: 1,
          updated_by: updated_by || null,
        },
      });
  
      // Deactivate the assignments of the temporary professor in the course
      await transaction.assignment.updateMany({
        where: {
          course_id: courseId,
          status: 2, 
          subject_id: {
            in: await transaction.assignment.findMany({
              where: {
                course_id: courseId,
                professor_id: professorId,
                status: 3,
              },
              select: { subject_id: true },
            }).then((assignments) => assignments.map((a) => a.subject_id)),
          },
        },
        data: {
          status: 0,
          updated_by: updated_by || null,
        },
      });
  
      return { message: 'Assignments updated successfully' };
    });
  }

  async getAssignmentsByCourse(courseId: number) {
    const db = Database.getInstance();
  
    return await db.assignment.findMany({
      where: {
        course_id: courseId,
        status: { in: [1, 2] },
        deleted_at: null, 
      },
      select: {
        id: true,
        subject_id: true,
        professor_id: true,
        status: true,
      },
    });
  }
}
