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

// Coding Contest for placement preparation
export const codingContests = pgTable("coding_contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  problems: integer("problems").array().notNull(), // Array of problem IDs
  rules: text("rules").notNull(),
  createdBy: integer("created_by").notNull(), // Admin ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  isPublished: true,
});

export type InsertCodingContest = z.infer<typeof insertCodingContestSchema>;
export type CodingContest = typeof codingContests.$inferSelect;

// Student Performance Metrics for placement readiness
export const studentPerformanceMetrics = pgTable("student_performance_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  academicProgress: integer("academic_progress").notNull().default(0), // 0-100%
  codingSkillRating: integer("coding_skill_rating").notNull().default(0), // 0-100%
  problemsSolved: integer("problems_solved").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0), // 0-100%
  contestsParticipated: integer("contests_participated").notNull().default(0),
  contestsWon: integer("contests_won").notNull().default(0),
  placementReadinessIndex: integer("placement_readiness_index").notNull().default(0), // 0-100%
  userName: text("user_name"),
});

export const insertStudentPerformanceMetricsSchema = createInsertSchema(studentPerformanceMetrics).pick({
  userId: true,
  academicProgress: true,
  codingSkillRating: true,
  problemsSolved: true,
  averageScore: true,
  contestsParticipated: true,
  contestsWon: true,
  placementReadinessIndex: true,
  userName: true,
});

export type InsertStudentPerformanceMetrics = z.infer<typeof insertStudentPerformanceMetricsSchema>;
export type StudentPerformanceMetrics = typeof studentPerformanceMetrics.$inferSelect;
