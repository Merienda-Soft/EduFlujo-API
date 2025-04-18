import Database from '../../../shared/database/connection';

export class AssignmentService {

  async createAssignments(assignmentsData: { course_id: number; professor_id: number; subject_id: number }[]) {
    const db = Database.getInstance();
  
    return await db.$transaction(async (transaction) => {
      const assignments = [];
  
      for (const { course_id, professor_id, subject_id } of assignmentsData) {
        const assignment = await transaction.assignment.create({
          data: {
            course_id,
            professor_id,
            subject_id,
            status: 1,
            quarter: null, 
          },
        });
        assignments.push(assignment);
      }
  
      return assignments;
    });
  }

  /*async updateAssignmentsByProfessor(
    courseId: number,
    oldProfessorId: number,
    newProfessorId: number,
    value: number // 1 = cambio permanente, 2 = sustitución temporal
  ) {
    const db = Database.getInstance();
  
    return await db.$transaction(async (transaction) => {
      // Get the subjects assigned to the old professor in the course
      const subjects = await transaction.assignment.findMany({
        where: {
          course_id: courseId,
          professor_id: oldProfessorId,
          status: 1,
        },
        select: { subject_id: true },
      });
  
      const subjectIds = subjects.map((assignment) => assignment.subject_id);
  
      if (subjectIds.length === 0) {
        throw new Error('El profesor no tiene materias activas en este curso.');
      }
  
      // Update the old assignments to absent (status 3)
      await transaction.assignment.updateMany({
        where: {
          course_id: courseId,
          professor_id: oldProfessorId,
          subject_id: { in: subjectIds },
          status: 1,
        },
        data: {
          status: 3,
        },
      });
  
      // Create new assignments for the new professor
      const newAssignments = [];
      for (const subjectId of subjectIds) {
        const newAssignment = await transaction.assignment.create({
          data: {
            course_id: courseId,
            professor_id: newProfessorId,
            subject_id: subjectId,
            status: value, 
            quarter: null, 
          },
        });
        newAssignments.push(newAssignment);
      }
  
      return newAssignments;
    });
  }*/

  async updateAssignmentsById(
      updates: { assignmentId: number; newProfessorId: number }[]
    ) {
      const db = Database.getInstance();
    
      return await db.$transaction(async (transaction) => {
        const updatedAssignments = [];
    
        for (const { assignmentId, newProfessorId } of updates) {
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
            data: { professor_id: newProfessorId },
          });
    
          updatedAssignments.push(updatedAssignment);
        }
    
        return updatedAssignments;
      });
  }

  async reactivateAssignments(courseId: number, professorId: number) {
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
      },
      select: {
        id: true,
        subject_id: true,
        professor_id: true,
      },
    });
  }
}
