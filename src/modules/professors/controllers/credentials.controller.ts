import { Request, Response } from 'express';
import { getStudentCredentials } from '../services/credentials.service';

/**
 * Controller to handle fetching student credentials based on management and course ID.
 */
export const getStudentCredentialsController = async (req: Request, res: Response) => {
  try {
    const { management, courseId } = req.query;

    if (!management || !courseId) {
      return res.status(400).json({ message: 'Management and courseId are required.' });
    }

    const credentials = await getStudentCredentials(management as string, courseId as string);
    return res.status(200).json(credentials);
  } catch (error) {
    console.error('Error fetching student credentials:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};