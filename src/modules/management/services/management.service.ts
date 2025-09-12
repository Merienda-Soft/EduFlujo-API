import Database from '../../../shared/database/connection';

export class ManagementService {
  async getAllManagements() {
    return await Database.getInstance().management.findMany({
      where: {
        status: 1,
      },
    });
  }

  async getActiveManagements() {
    return await Database.getInstance().management.findMany({
      where: {
        status: 1,
      },
    });
  }

  async getUserByEmail(email: string) {
    const person = await Database.getInstance().person.findFirst({
      where: { 
        email: email,
        status: 1,
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new Error('No se encontró un usuario con el email proporcionado.');
    }

    return { id: person.id };
  }

  async getAllDegree() {
    return await Database.getInstance().degree.findMany({
      where: {
        status: 1,
      },
    });
  }

  async getManagementById(id: number) {
    return await Database.getInstance().management.findUnique({
      where: { 
        id: id,
        status: 1,
      },
    });
  }

  async updateManagement(id: number, data: any, updated_by?: number) {
    return await Database.getInstance().management.update({
      where: { id: id },
      data: {
        ...data,
        updated_by: updated_by || null,
      },
    });
  }

  async deactivateManagement(id: number, updated_by?: number): Promise<void> {
    await Database.getInstance().management.update({
      where: { id: id },
      data: { 
        status: 0,
        updated_by: updated_by || null,
      } 
    });
  }

  async cloneAcademicStructure(
    sourceManagementId: number,
    newManagementYear: number,
    quarterDates: {
      start_date: Date;
      end_date: Date;
      first_quarter_start: Date;
      first_quarter_end: Date;
      second_quarter_start: Date;
      second_quarter_end: Date;
      third_quarter_start: Date;
      third_quarter_end: Date;
    },
    created_by?: number
  ) {
    const prisma = Database.getInstance();
  
    return await prisma.$transaction(async (tx) => {
      await tx.management.updateMany({
        data: {
            status: 0,
        },
      });
      const newManagement = await tx.management.create({
        data: {
          management: newManagementYear,
          status: 1, // 1 = Activo
          start_date: quarterDates.start_date,
          end_date: quarterDates.end_date,
          first_quarter_start: quarterDates.first_quarter_start,
          first_quarter_end: quarterDates.first_quarter_end,
          second_quarter_start: quarterDates.second_quarter_start,
          second_quarter_end: quarterDates.second_quarter_end,
          third_quarter_start: quarterDates.third_quarter_start,
          third_quarter_end: quarterDates.third_quarter_end,
          created_by: created_by || null,
        }
      });

      const clonedCourses = await tx.$queryRaw<{count: bigint}>`
        WITH inserted_courses AS (
          INSERT INTO "Course" (parallel, course, status, degree_id, management_id, last_update)
          SELECT 
            c.parallel,
            CASE 
              WHEN c.course LIKE '%°%' THEN 
                (CAST(SUBSTRING(c.course FROM 1 FOR POSITION('°' IN c.course)-1) AS INTEGER) + 1) || 
                '°' || 
                SUBSTRING(c.course FROM POSITION('°' IN c.course)+1)
              ELSE c.course
            END,
            c.status,
            CASE
              WHEN d.degree = 'PRIMERO' THEN (SELECT _id FROM "Degree" WHERE degree = 'SEGUNDO')
              WHEN d.degree = 'SEGUNDO' THEN (SELECT _id FROM "Degree" WHERE degree = 'TERCERO')
              WHEN d.degree = 'TERCERO' THEN (SELECT _id FROM "Degree" WHERE degree = 'CUARTO')
              WHEN d.degree = 'CUARTO' THEN (SELECT _id FROM "Degree" WHERE degree = 'QUINTO')
              WHEN d.degree = 'QUINTO' THEN (SELECT _id FROM "Degree" WHERE degree = 'SEXTO')
              ELSE d._id
            END as degree_id,
            ${newManagement.id} as management_id,
            NOW() as last_update
          FROM "Course" c
          JOIN "Degree" d ON c.degree_id = d._id
          WHERE c.management_id = ${sourceManagementId}
          AND d.degree IN ('PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO')
          RETURNING _id
        )
        SELECT COUNT(*) FROM inserted_courses
      `;
  
      const [clonedCurricula, clonedAssignments, clonedRegistrations, clonedContents] = await Promise.all([
        tx.$queryRaw<{count: bigint}>`
          WITH inserted AS (
            INSERT INTO "Curriculum" (course_id, subject_id, management_id)
            SELECT 
              new_c._id, 
              cu.subject_id, 
              ${newManagement.id}
            FROM "Curriculum" cu
            JOIN "Course" old_c ON cu.course_id = old_c._id
            JOIN "Course" new_c ON 
              new_c.management_id = ${newManagement.id} AND
              new_c.parallel = old_c.parallel AND
              new_c.degree_id = (
                SELECT _id FROM "Degree" WHERE degree = 
                CASE
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'PRIMERO' THEN 'SEGUNDO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'SEGUNDO' THEN 'TERCERO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'TERCERO' THEN 'CUARTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'CUARTO' THEN 'QUINTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'QUINTO' THEN 'SEXTO'
                END
              )
            WHERE cu.management_id = ${sourceManagementId}
            RETURNING 1
          )
          SELECT COUNT(*) FROM inserted
        `,
        
        tx.$queryRaw<{count: bigint}>`
          WITH inserted AS (
            INSERT INTO "Assignment" (quarter, status, course_id, professor_id, subject_id, management_id)
            SELECT 
              a.quarter, 
              a.status, 
              new_c._id, 
              a.professor_id, 
              a.subject_id,
              ${newManagement.id}
            FROM "Assignment" a
            JOIN "Course" old_c ON a.course_id = old_c._id
            JOIN "Course" new_c ON 
              new_c.management_id = ${newManagement.id} AND
              new_c.parallel = old_c.parallel AND
              new_c.degree_id = (
                SELECT _id FROM "Degree" WHERE degree = 
                CASE
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'PRIMERO' THEN 'SEGUNDO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'SEGUNDO' THEN 'TERCERO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'TERCERO' THEN 'CUARTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'CUARTO' THEN 'QUINTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'QUINTO' THEN 'SEXTO'
                END
              )
            WHERE EXISTS (
              SELECT 1 FROM "Curriculum" cu 
              WHERE cu.course_id = new_c._id 
              AND cu.subject_id = a.subject_id
            )
            RETURNING 1
          )
          SELECT COUNT(*) FROM inserted
        `,
        
        tx.$queryRaw<{count: bigint}>`
          WITH valid_students AS (
            -- EFECTIVOS & MARK SUBJECT < 51
            SELECT DISTINCT r.student_id
            FROM "Registration" r
            JOIN "Student" s ON r.student_id = s.id
            WHERE r.management_id = ${sourceManagementId}
            AND s.matricula = 'EFECTIVO'
            AND NOT EXISTS (
              SELECT 1 FROM "MarkSubject" ms
              WHERE ms.student_id = r.student_id
              AND ms.management_id = ${sourceManagementId}
              AND ms.mark_subject < 51
            )
          ),
          inserted AS (
            INSERT INTO "Registration" (course_id, student_id, management_id)
            SELECT 
              new_c._id, 
              r.student_id, 
              ${newManagement.id}
            FROM "Registration" r
            JOIN "Course" old_c ON r.course_id = old_c._id
            JOIN "Course" new_c ON 
              new_c.management_id = ${newManagement.id} AND
              new_c.parallel = old_c.parallel AND
              new_c.degree_id = (
                SELECT _id FROM "Degree" WHERE degree = 
                CASE
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'PRIMERO' THEN 'SEGUNDO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'SEGUNDO' THEN 'TERCERO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'TERCERO' THEN 'CUARTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'CUARTO' THEN 'QUINTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'QUINTO' THEN 'SEXTO'
                END
              )
            WHERE r.management_id = ${sourceManagementId}
            AND r.student_id IN (SELECT student_id FROM valid_students)
            RETURNING 1
          )
          SELECT COUNT(*) FROM inserted
        `,
        
        // Contenidos de cursos
        tx.$queryRaw<{count: bigint}>`
          WITH inserted AS (
            INSERT INTO "Content" (course_id, subject_id, management_id, file, submitted_at, last_update)
            SELECT 
              new_c._id,
              co.subject_id,
              ${newManagement.id},
              co.file,
              NOW(),
              NOW()
            FROM "Content" co
            JOIN "Course" old_c ON co.course_id = old_c._id
            JOIN "Course" new_c ON 
              new_c.management_id = ${newManagement.id} AND
              new_c.parallel = old_c.parallel AND
              new_c.degree_id = (
                SELECT _id FROM "Degree" WHERE degree = 
                CASE
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'PRIMERO' THEN 'SEGUNDO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'SEGUNDO' THEN 'TERCERO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'TERCERO' THEN 'CUARTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'CUARTO' THEN 'QUINTO'
                  WHEN (SELECT degree FROM "Degree" WHERE _id = old_c.degree_id) = 'QUINTO' THEN 'SEXTO'
                END
              )
            WHERE co.management_id = ${sourceManagementId}
            RETURNING 1
          )
          SELECT COUNT(*) FROM inserted
        `
      ]);
  
      return {
        success: true,
        new_management_id: newManagement.id.toString(),
        new_management_year: newManagement.management.toString(),
        results: {
          new_courses: clonedCourses[0].count.toString(),
          new_curricula: clonedCurricula[0].count.toString(),
          new_assignments: clonedAssignments[0].count.toString(),
          new_registrations: clonedRegistrations[0].count.toString(),
          new_contents: clonedContents[0].count.toString()
        }
      };
    });
  }
}