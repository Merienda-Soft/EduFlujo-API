export interface CheckCoursesMarksDto {
  managementId: number;
}

export interface CourseMarkStatusDto {
  course_name: string;
  has_marks: boolean;
}

export interface CheckCoursesMarksResponseDto {
  success: boolean;
  message: string;
  data: CourseMarkStatusDto[];
  is_checked: boolean;
}