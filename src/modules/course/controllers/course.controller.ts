import { Request, Response } from 'express';
import { CourseService } from '../services/course.service';

export class CourseController {
  private courseService = new CourseService();

  async getAllCourses(req: Request, res: Response) {
    try {
      const courses = await this.courseService.getAllCourses();
      res.status(200).json(courses);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getCourseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await this.courseService.getCourseById(Number(id));
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.status(200).json(course);
    } catch (error) {
      this.handleError(res, error);
    }
  }


  async createCourse(req: Request, res: Response) {
    try {
      const courseData = req.body;
      const newCourse = await this.courseService.createCourse(courseData);
      res.status(201).json(newCourse);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const courseData = req.body;
      const updatedCourse = await this.courseService.updateCourse(Number(id), courseData);
      res.status(200).json(updatedCourse);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async activatedCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.courseService.activatedCourse(Number(id));
      res.status(200).json({ message: 'Course active successfully' });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.courseService.deactivatedCourse(Number(id));
      res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getCoursesByDegree(req: Request, res: Response) {
    try {
      const { degreeId } = req.params;
      const courses = await this.courseService.getCoursesByDegree(Number(degreeId));
      res.status(200).json(courses);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getCourseWithCurriculum(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const course = await this.courseService.getCourseWithCurriculum(Number(courseId));
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.status(200).json(course);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}