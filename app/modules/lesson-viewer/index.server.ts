/**
 * Data for the lesson page (`/courses/:slug/lessons/:lessonId`): the lesson
 * and its course, the Student's progress, the Discussion thread, and quiz
 * grading.
 */
export {
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonComplete,
  markLessonInProgress,
  getLastWatchPosition,
  calculateWatchProgress,
  getCommentById,
  getQuizById,
  getQuizByLessonId,
  getQuizWithQuestions,
  getBestAttempt,
} from "./lib/queries.server";
export { getLessonThread, renderThread } from "./lib/thread.server";
export { computeResult } from "./lib/quiz.server";
export { flattenCourseLessons } from "./lib/lessons";
