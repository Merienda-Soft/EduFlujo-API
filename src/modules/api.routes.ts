import { Router } from 'express';
import managementRouter from './management/routes';
import {tasksRouter, managementRouters} from './tasks/routes'; 
import authRouter from './auth/routes';
import {professorsRouter, tutorStudentRouter, contentRouter} from './professors/routes';
import { studentRouter, attendanceRouter } from './attendance/routes';
import courseRouter from './course/routes';
import assignmentRouter from './assignment/routes';
import subjectRouter from './subject/routes';
import registrationRouter from './registration/routes';

const router = Router();

router.use('/tasks', tasksRouter);
router.use('/auth', authRouter);
router.use('/professors', professorsRouter);
router.use('/management', managementRouter);        
router.use('/tutor-student', tutorStudentRouter);
router.use('/students', studentRouter);
router.use('/attendance', attendanceRouter);
router.use('/course', courseRouter);
router.use('/assignment', assignmentRouter);
router.use('/subject', subjectRouter);
router.use('/content', contentRouter);
router.use('/registration', registrationRouter);

export default router;