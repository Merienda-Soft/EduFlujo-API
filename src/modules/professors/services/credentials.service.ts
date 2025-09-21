import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service to fetch student credentials based on management and course ID.
 * @param management - The management ID.
 * @param courseId - The course ID.
 * @returns An array of student credentials.
 */
export const getStudentCredentials = async (management: string, courseId: string) => {
  try {
    const students = await prisma.registration.findMany({
      where: {
        management_id: parseInt(management, 10),
        course_id: parseInt(courseId, 10),
        status: 1, // Ensure the registration is active
      },
      include: {
        student: {
          include: {
            person: {
              select: {
                name: true,
                lastname: true,
                second_lastname: true,
                email: true,
                temp_password: true,
              },
            },
          },
        },
      },
    });

    return students.map((registration) => {
      const { student } = registration;
      return {
        email: student.person.email,
        temp_password: student.person.temp_password,
        fullName: `${student.person.name} ${student.person.lastname} ${student.person.second_lastname || ''}`.trim(),
      };
    });
  } catch (error) {
    console.error('Error fetching student credentials:', error);
    throw new Error('Failed to fetch student credentials.');
  }
};