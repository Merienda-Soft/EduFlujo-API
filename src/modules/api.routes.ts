import { Router } from 'express';
import managementRouter from './management/routes';
import {tasksRouter, managementRouters} from './tasks/routes'; 
import authRouter from './auth/routes';
import {professorsRouter, tutorStudentRouter} from './professors/routes';
import { studentRouter, attendanceRouter } from './attendance/routes';
import courseRouter from './course/routes';
import assignmentRouter from './assignment/routes';

const router = Router();

router.use('/tasks', tasksRouter);
router.use('/auth', authRouter);
router.use('/professors', professorsRouter);
router.use('/management', managementRouter);
router.use('/managements', managementRouters);
router.use('/tutor-student', tutorStudentRouter);
router.use('/students', studentRouter);
router.use('/attendance', attendanceRouter);
router.use('/course', tutorStudentRouter);
router.use('/assignment', assignmentRouter);

export default router;