import Database from '../../../shared/database/connection';

export class AssignmentService {
  async createAssignments(
    courseId: number,
    generalAssignments: { professorId: number; subjectId: number }[],
    technicalAssignments: { professorId: number; subjectId: number }[]
  ) {
    const db = Database.getInstance();

    return await db.$transaction(async (transaction) => {
      const assignments = [];

      // Asign general subjects
      for (const { professorId, subjectId } of generalAssignments) {
        const assignment = await transaction.assignment.create({
          data: {
            course_id: courseId,
            professor_id: professorId,
            subject_id: subjectId,
            status: 1, 
            quarter: null, 
          },
        });
        assignments.push(assignment);
      }

      // Asign technical subjects
      for (const { professorId, subjectId } of technicalAssignments) {
        const assignment = await transaction.assignment.create({
          data: {
            course_id: courseId,
            professor_id: professorId,
            subject_id: subjectId,
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

  async updateAssignments(
    courseId: number,
    updates: { oldProfessorId: number; newProfessorId: number; subjectId: number }[],
    value: number // 1 = caambio permanente, 2 = sustitución temporal
  ) {
    const db = Database.getInstance();

    return await db.$transaction(async (transaction) => {
      const updatedAssignments = [];

      for (const { oldProfessorId, newProfessorId, subjectId } of updates) {
        // Update the old assignment to absent
        await transaction.assignment.updateMany({
          where: {
            course_id: courseId,
            professor_id: oldProfessorId,
            subject_id: subjectId,
            status: 1, // 0 = inactive, 1 = active, 2 = temporary, 3 = absent
          },
          data: {
            status: 3,
          },
        });

        // Create a new assignment with the new professor
        const newAssignment = await transaction.assignment.create({
          data: {
            course_id: courseId,
            professor_id: newProfessorId,
            subject_id: subjectId,
            status: value,
            quarter: null,
          },
        });

        updatedAssignments.push(newAssignment);
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
        status: true,
        subject: {
          select: {
            subject: true, 
          },
        },
        professor: {
          select: {
            id: true,
            person: {
              select: {
                name: true,
                lastname: true,
                second_lastname: true,
              },
            },
          },
        },
      },
    }).then((assignments) =>
      assignments.map((assignment) => ({
        id: assignment.id,
        subject: assignment.subject?.subject || null,
        professor: {
          id: assignment.professor?.id || null,
          full_name: assignment.professor?.person
            ? `${assignment.professor.person.name || ''} ${assignment.professor.person.lastname || ''} ${assignment.professor.person.second_lastname || ''}`.trim()
            : null,
        },
        is_temporary: assignment.status === 2 ? 1 : 0, 
      }))
    );
  }
}
