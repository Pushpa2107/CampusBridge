import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  profileImage: text("profile_image"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  profileImage: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Courses
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorId: integer("instructor_id").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  title: true,
  description: true,
  instructorId: true,
  category: true,
  icon: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Course Enrollments
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  progress: integer("progress").notNull().default(0),
  grade: text("grade"),
});

export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).pick({
  userId: true,
  courseId: true,
  progress: true,
  grade: true,
});

export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

// Coding Problems
export const codingProblems = pgTable("coding_problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  topics: text("topics").array().notNull(),
  starterCode: text("starter_code").notNull(),
  testCases: jsonb("test_cases").notNull(),
  successRate: integer("success_rate").notNull().default(0),
});

export const insertCodingProblemSchema = createInsertSchema(codingProblems).pick({
  title: true,
  description: true,
  difficulty: true,
  topics: true,
  starterCode: true,
  testCases: true,
  successRate: true,
});

export type InsertCodingProblem = z.infer<typeof insertCodingProblemSchema>;
export type CodingProblem = typeof codingProblems.$inferSelect;

// Problem Solutions
export const problemSolutions = pgTable("problem_solutions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  problemId: integer("problem_id").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  executionTime: integer("execution_time"),
  score: integer("score"),
});

export const insertProblemSolutionSchema = createInsertSchema(problemSolutions).pick({
  userId: true,
  problemId: true,
  code: true,
  language: true,
  status: true,
  submittedAt: true,
  executionTime: true,
  score: true,
});

export type InsertProblemSolution = z.infer<typeof insertProblemSolutionSchema>;
export type ProblemSolution = typeof problemSolutions.$inferSelect;

// Learning Paths
export const learningPaths = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  topics: text("topics").array().notNull(),
  prerequisites: text("prerequisites").array(),
});

export const insertLearningPathSchema = createInsertSchema(learningPaths).pick({
  title: true,
  description: true,
  difficulty: true,
  estimatedHours: true,
  topics: true,
  prerequisites: true,
});

export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type LearningPath = typeof learningPaths.$inferSelect;

// Path Enrollments
export const pathEnrollments = pgTable("path_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pathId: integer("path_id").notNull(),
  progress: integer("progress").notNull().default(0),
  enrolledAt: timestamp("enrolled_at").notNull(),
});

export const insertPathEnrollmentSchema = createInsertSchema(pathEnrollments).pick({
  userId: true,
  pathId: true,
  progress: true,
  enrolledAt: true,
});

export type InsertPathEnrollment = z.infer<typeof insertPathEnrollmentSchema>;
export type PathEnrollment = typeof pathEnrollments.$inferSelect;

// Events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  organizer: text("organizer").notNull(),
  eventType: text("event_type").notNull(), // webinar, workshop, hackathon, etc.
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  organizer: true,
  eventType: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(), // login, submission, completion, etc.
  timestamp: timestamp("timestamp").notNull(),
  details: jsonb("details"),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  userId: true,
  activityType: true,
  timestamp: true,
  details: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Course Materials (PDFs, videos, quizzes)
export const courseContents = pgTable("course_contents", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(), // 'pdf', 'video', 'quiz', etc.
  contentUrl: text("content_url").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(), // Faculty ID
  dueDate: timestamp("due_date"),
  isPublished: boolean("is_published").notNull().default(false),
});

export const insertCourseContentSchema = createInsertSchema(courseContents).pick({
  courseId: true,
  title: true,
  description: true,
  contentType: true,
  contentUrl: true,
  order: true,
  createdBy: true,
  dueDate: true,
  isPublished: true,
});

export type InsertCourseContent = z.infer<typeof insertCourseContentSchema>;
export type CourseContent = typeof courseContents.$inferSelect;

// Coding Assignments (different from practice problems)
export const codingAssignments = pgTable("coding_assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  deadline: timestamp("deadline").notNull(),
  maxScore: integer("max_score").notNull().default(100),
  instructions: text("instructions").notNull(),
  testCases: jsonb("test_cases").notNull(),
  createdBy: integer("created_by").notNull(), // Faculty ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
});

export const insertCodingAssignmentSchema = createInsertSchema(codingAssignments).pick({
  courseId: true,
  title: true,
  description: true,
  difficulty: true,
  deadline: true,
  maxScore: true,
  instructions: true,
  testCases: true,
  createdBy: true,
  isPublished: true,
});

export type InsertCodingAssignment = z.infer<typeof insertCodingAssignmentSchema>;
export type CodingAssignment = typeof codingAssignments.$inferSelect;

// Assignment Submissions
export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  gradedBy: integer("graded_by"),
  gradedAt: timestamp("graded_at"),
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).pick({
  assignmentId: true,
  userId: true,
  code: true,
  language: true,
  submittedAt: true,
  score: true,
  feedback: true,
  gradedBy: true,
  gradedAt: true,
});

export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;

// Quizzes
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit"), // in minutes
  passingScore: integer("passing_score").notNull().default(70),
  questions: jsonb("questions").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
});

export const insertQuizSchema = createInsertSchema(quizzes).pick({
  contentId: true,
  title: true,
  description: true,
  timeLimit: true,
  passingScore: true,
  questions: true,
  createdBy: true,
  isPublished: true,
});

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

// Quiz Attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  userId: integer("user_id").notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  isPassed: boolean("is_passed"),
  answers: jsonb("answers"),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).pick({
  quizId: true,
  userId: true,
  startedAt: true,
  completedAt: true,
  score: true,
  isPassed: true,
  answers: true,
});

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

// CodeRooms (for collaborative coding)
export const codeRooms = pgTable("code_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPrivate: boolean("is_private").notNull().default(false),
  password: text("password"),
  expiresAt: timestamp("expires_at"),
});

export const insertCodeRoomSchema = createInsertSchema(codeRooms).pick({
  name: true,
  description: true,
  createdBy: true,
  isPrivate: true,
  password: true,
  expiresAt: true,
});

export type InsertCodeRoom = z.infer<typeof insertCodeRoomSchema>;
export type CodeRoom = typeof codeRooms.$inferSelect;

// Admin Placement Panel Entities

// Coding Contests
export const codingContests = pgTable("coding_contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  problems: integer("problems").array().notNull(),
  rules: text("rules").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
});

export const insertCodingContestSchema = createInsertSchema(codingContests).pick({
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  problems: true,
  rules: true,
  createdBy: true,
  createdAt: true,
  isPublished: true,
});

export type InsertCodingContest = z.infer<typeof insertCodingContestSchema>;
export type CodingContest = typeof codingContests.$inferSelect;

// Contest Registrations
export const contestRegistrations = pgTable("contest_registrations", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  userId: integer("user_id").notNull(),
  registeredAt: timestamp("registered_at").notNull(),
  status: text("status").notNull(), // registered, confirmed, completed, etc.
});

export const insertContestRegistrationSchema = createInsertSchema(contestRegistrations).pick({
  contestId: true,
  userId: true,
  registeredAt: true,
  status: true,
});

export type InsertContestRegistration = z.infer<typeof insertContestRegistrationSchema>;
export type ContestRegistration = typeof contestRegistrations.$inferSelect;

export const studentPerformanceMetrics = pgTable("student_performance_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  userName: text("user_name"),
  academicProgress: integer("academic_progress").notNull().default(0),
  codingSkillRating: integer("coding_skill_rating").notNull().default(0),
  problemsSolved: integer("problems_solved").notNull().default(0),
  contestsParticipated: integer("contests_participated").notNull().default(0),
  assignmentsCompleted: integer("assignments_completed").notNull().default(0),
  quizzesCompleted: integer("quizzes_completed").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  placementReadinessIndex: integer("placement_readiness_index").notNull().default(0),
});

export const insertStudentPerformanceMetricsSchema = createInsertSchema(studentPerformanceMetrics).pick({
  userId: true,
  userName: true,
  academicProgress: true,
  codingSkillRating: true,
  problemsSolved: true,
  contestsParticipated: true,
  assignmentsCompleted: true,
  quizzesCompleted: true,
  averageScore: true,
  placementReadinessIndex: true,
});

export type InsertStudentPerformanceMetrics = z.infer<typeof insertStudentPerformanceMetricsSchema>;
export type StudentPerformanceMetrics = typeof studentPerformanceMetrics.$inferSelect;
