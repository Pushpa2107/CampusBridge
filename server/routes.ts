import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import crypto from "crypto";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Store active connections by room
  const rooms: Record<string, Set<any>> = {};

  // Initialize WebSocket server for code rooms
  wss.on("connection", (ws) => {
    let roomId = "";
    let userId = 0;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "join") {
          // Store room info when user joins
          roomId = data.roomId;
          userId = data.userId;
          
          // Create room if doesn't exist
          if (!rooms[roomId]) {
            rooms[roomId] = new Set();
          }
          
          // Add user to room
          rooms[roomId].add(ws);
          
          // Notify everyone about the new user
          broadcastToRoom(roomId, {
            type: "user_joined",
            userId: data.userId,
            username: data.username,
            timestamp: new Date().toISOString()
          }, userId);
          
          // Send current users to the new joiner
          ws.send(JSON.stringify({
            type: "room_info",
            roomId,
            userCount: rooms[roomId].size,
            timestamp: new Date().toISOString()
          }));
        } 
        else if (data.type === "code_update") {
          // Broadcast code updates to all users in the room
          broadcastToRoom(roomId, {
            type: "code_update",
            code: data.code,
            language: data.language,
            userId: data.userId,
            username: data.username,
            timestamp: new Date().toISOString()
          }, userId);
        }
        else if (data.type === "chat_message") {
          // Broadcast chat messages to all users in the room
          broadcastToRoom(roomId, {
            type: "chat_message",
            message: data.message,
            userId: data.userId,
            username: data.username,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (roomId && rooms[roomId]) {
        // Remove user from room
        rooms[roomId].delete(ws);
        
        // Notify others that user left
        broadcastToRoom(roomId, {
          type: "user_left",
          userId,
          timestamp: new Date().toISOString()
        });
        
        // Clean up empty rooms
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        }
      }
    });
  });

  function broadcastToRoom(roomId, message, excludeUserId = null) {
    if (!rooms[roomId]) return;
    
    rooms[roomId].forEach((client) => {
      if (client.readyState === 1) { // Open connection
        // Skip sending to the originator if excludeUserId is set
        if (excludeUserId && client === excludeUserId) return;
        client.send(JSON.stringify(message));
      }
    });
  }

  // API routes
  // User routes
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Course routes
  app.get("/api/courses", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      let courses;
      if (req.user.role === 'faculty') {
        courses = await storage.getCoursesByInstructor(req.user.id);
      } else {
        courses = await storage.getCourses();
      }
      res.json(courses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/courses", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'faculty') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const course = await storage.createCourse({
        ...req.body,
        instructorId: req.user.id
      });
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Course enrollments
  app.get("/api/enrollments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const enrollments = await storage.getCourseEnrollmentsByUser(req.user.id);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/enrollments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const enrollment = await storage.createCourseEnrollment({
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Course content routes (for faculty)
  app.get("/api/courses/:courseId/contents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const courseId = parseInt(req.params.courseId);
      const contents = await storage.getCourseContentsByCourse(courseId);
      
      // If user is a student, only return published content
      if (req.user.role === 'student') {
        return res.json(contents.filter(content => content.isPublished));
      }
      
      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/course-contents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const content = await storage.createCourseContent({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(content);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/course-contents/:id/publish", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const isPublished = req.body.isPublished;
      
      const content = await storage.updateCourseContentPublishStatus(id, isPublished);
      
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Coding assignments routes (for faculty)
  app.get("/api/courses/:courseId/assignments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const courseId = parseInt(req.params.courseId);
      const assignments = await storage.getCodingAssignmentsByCourse(courseId);
      
      // If user is a student, only return published assignments
      if (req.user.role === 'student') {
        return res.json(assignments.filter(assignment => assignment.isPublished));
      }
      
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/coding-assignments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const assignment = await storage.createCodingAssignment({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/coding-assignments/:id/publish", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const isPublished = req.body.isPublished;
      
      const assignment = await storage.updateCodingAssignmentPublishStatus(id, isPublished);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assignment submissions
  app.get("/api/assignments/:assignmentId/submissions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      let submissions;
      
      if (['faculty', 'admin'].includes(req.user.role)) {
        // Faculty and admin can see all submissions
        submissions = await storage.getAssignmentSubmissionsByAssignment(assignmentId);
      } else {
        // Students can only see their own submissions
        const allSubmissions = await storage.getAssignmentSubmissionsByAssignment(assignmentId);
        submissions = allSubmissions.filter(sub => sub.userId === req.user.id);
      }
      
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assignment-submissions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const submission = await storage.createAssignmentSubmission({
        ...req.body,
        userId: req.user.id,
        submittedAt: new Date().toISOString()
      });
      res.status(201).json(submission);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/assignment-submissions/:id/grade", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !['faculty', 'admin'].includes(req.user.role)) {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const { score, feedback } = req.body;
      
      const submission = await storage.gradeAssignmentSubmission(id, score, feedback, req.user.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Coding practice problems
  app.get("/api/problems", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      let problems;
      
      if (req.query.difficulty) {
        problems = await storage.getCodingProblemsByDifficulty(req.query.difficulty as string);
      } else if (req.query.topic) {
        problems = await storage.getCodingProblemsByTopic(req.query.topic as string);
      } else {
        problems = await storage.getCodingProblems();
      }
      
      res.json(problems);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/problems/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const problem = await storage.getCodingProblem(id);
      
      if (!problem) {
        return res.status(404).json({ error: "Problem not found" });
      }
      
      res.json(problem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Problem solutions
  app.post("/api/problem-solutions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const solution = await storage.createProblemSolution({
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(solution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/problems/:problemId/solutions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const problemId = parseInt(req.params.problemId);
      const solutions = await storage.getProblemSolutionsByProblem(problemId);
      res.json(solutions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/Placement routes

  // Coding contests
  app.get("/api/coding-contests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const contests = await storage.getCodingContests();
      
      // If user is a student, only return published contests
      if (req.user.role === 'student') {
        return res.json(contests.filter(contest => contest.isPublished));
      }
      
      res.json(contests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/coding-contests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const contest = await storage.createCodingContest({
        ...req.body,
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      });
      res.status(201).json(contest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/coding-contests/:id/publish", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const id = parseInt(req.params.id);
      const isPublished = req.body.isPublished;
      
      const contest = await storage.updateCodingContestPublishStatus(id, isPublished);
      
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }
      
      res.json(contest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Contest registrations
  app.post("/api/contest-registrations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const registration = await storage.createContestRegistration({
        contestId: req.body.contestId,
        userId: req.user.id,
        registeredAt: new Date().toISOString(),
        status: "registered"
      });
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/coding-contests/:contestId/registrations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const contestId = parseInt(req.params.contestId);
      const registrations = await storage.getContestRegistrationsByContest(contestId);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Student performance metrics
  app.get("/api/student-performance", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const metrics = await storage.getAllStudentPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/top-performers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const performers = await storage.getTopPerformers(limit);
      res.json(performers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // OpenAI routes for AI features
  
  // Code Help API
  app.post("/api/code-help", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const { code, question, language } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are an expert programming tutor specializing in ${language}. 
                     Provide clear, educational explanations without writing full solutions. 
                     Focus on helping the student learn concepts and problem-solving approaches.`
          },
          {
            role: "user",
            content: `Here's my code in ${language}:\n\n${code}\n\nMy question is: ${question}`
          }
        ],
        max_tokens: 1000
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        activityType: "code_help",
        details: { language, questionLength: question.length },
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        answer: response.choices[0].message.content,
        tokens: response.usage.total_tokens
      });
    } catch (error) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ error: error.message || "Error processing request" });
    }
  });
  
  // Code Review API
  app.post("/api/code-review", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const { code, language } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are an expert code reviewer specializing in ${language}.
                     Analyze the following code and provide feedback on:
                     1. Code quality and readability
                     2. Potential bugs or edge cases
                     3. Performance considerations
                     4. Best practices
                     Format your response with clear sections and specific recommendations.`
          },
          {
            role: "user",
            content: `Please review this ${language} code:\n\n${code}`
          }
        ],
        max_tokens: 1500
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        activityType: "code_review",
        details: { language, codeLength: code.length },
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        review: response.choices[0].message.content,
        tokens: response.usage.total_tokens
      });
    } catch (error) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ error: error.message || "Error processing request" });
    }
  });
  
  // Job Match API
  app.post("/api/job-match", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const { skills, interests, experience } = req.body;
      
      const skillsStr = Array.isArray(skills) ? skills.join(", ") : skills;
      const interestsStr = Array.isArray(interests) ? interests.join(", ") : interests;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are a career advisor specialized in tech and software development roles.
                     Based on the student's skills, interests, and experience, recommend suitable
                     job roles, technologies to learn, and career advice. Format your response as JSON.`
          },
          {
            role: "user",
            content: `Find job matches based on:
                     Skills: ${skillsStr}
                     Interests: ${interestsStr}
                     Experience level: ${experience}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });
      
      // Parse the JSON response
      const recommendations = JSON.parse(response.choices[0].message.content);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        activityType: "job_match",
        details: { skills, interests, experience },
        timestamp: new Date().toISOString()
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ error: error.message || "Error processing request" });
    }
  });

  // Initialize demo data if needed
  await initializeDemoData();

  return httpServer;
}

// Function to initialize demo data for hackathon
async function initializeDemoData() {
  try {
    // Check if users exist
    const users = await storage.getUsers();
    
    if (users.length === 0) {
      console.log("Initializing demo data for hackathon...");
      
      // Create demo users
      const admin = await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        fullName: "Admin User",
        email: "admin@campus.edu",
        role: "admin",
        profileImage: ""
      });
      
      const faculty1 = await storage.createUser({
        username: "professor",
        password: await hashPassword("faculty123"),
        fullName: "Jane Smith",
        email: "faculty@campus.edu",
        role: "faculty",
        profileImage: ""
      });
      
      const student1 = await storage.createUser({
        username: "student",
        password: await hashPassword("student123"),
        fullName: "John Doe",
        email: "student@campus.edu",
        role: "student",
        profileImage: ""
      });
      
      // Create demo courses
      const course1 = await storage.createCourse({
        title: "Introduction to Programming",
        description: "Learn the basics of programming with JavaScript",
        instructorId: faculty1.id,
        category: "Programming",
        icon: "code"
      });
      
      const course2 = await storage.createCourse({
        title: "Data Structures and Algorithms",
        description: "Understanding fundamental data structures and algorithms",
        instructorId: faculty1.id,
        category: "Computer Science",
        icon: "database"
      });
      
      // Create demo course content
      await storage.createCourseContent({
        courseId: course1.id,
        title: "Introduction to Variables",
        description: "Learn about variables in JavaScript",
        contentType: "pdf",
        contentUrl: "https://example.com/variables.pdf",
        order: 1,
        createdBy: faculty1.id,
        isPublished: true
      });
      
      await storage.createCourseContent({
        courseId: course1.id,
        title: "Functions and Methods",
        description: "Understanding functions in JavaScript",
        contentType: "video",
        contentUrl: "https://example.com/functions.mp4",
        order: 2,
        createdBy: faculty1.id,
        isPublished: true
      });
      
      // Create demo coding problems
      const problem1 = await storage.createCodingProblem({
        title: "FizzBuzz",
        description: "Write a program that prints numbers from 1 to 100, but for multiples of 3 print 'Fizz' and for multiples of 5 print 'Buzz'",
        difficulty: "easy",
        topics: ["loops", "conditionals"],
        starterCode: "function fizzBuzz() {\n  // Your code here\n}",
        testCases: [
          { input: "", expectedOutput: "1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz, 16" }
        ],
        successRate: 75
      });
      
      const problem2 = await storage.createCodingProblem({
        title: "Palindrome Check",
        description: "Write a function to check if a string is a palindrome (reads the same forward and backward)",
        difficulty: "medium",
        topics: ["strings", "algorithms"],
        starterCode: "function isPalindrome(str) {\n  // Your code here\n}",
        testCases: [
          { input: "racecar", expectedOutput: "true" },
          { input: "hello", expectedOutput: "false" }
        ],
        successRate: 60
      });
      
      // Create demo coding assignment
      await storage.createCodingAssignment({
        courseId: course1.id,
        title: "JavaScript Basics Assignment",
        description: "Implement a simple calculator using JavaScript",
        difficulty: "medium",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 100,
        instructions: "Create a calculator that can perform addition, subtraction, multiplication and division",
        testCases: [
          { input: "add(2, 3)", expectedOutput: "5" },
          { input: "subtract(5, 2)", expectedOutput: "3" },
          { input: "multiply(3, 4)", expectedOutput: "12" },
          { input: "divide(10, 2)", expectedOutput: "5" }
        ],
        createdBy: faculty1.id,
        isPublished: true
      });
      
      // Create demo coding contest
      await storage.createCodingContest({
        title: "Campus Coding Championship",
        description: "Test your skills against other students in this coding contest",
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        problems: [problem1.id, problem2.id],
        rules: "1. You can use any programming language\n2. No external libraries allowed\n3. Submit your solutions before the deadline",
        createdBy: admin.id,
        createdAt: new Date().toISOString(),
        isPublished: true
      });
      
      // Create demo student performance metrics
      await storage.createStudentPerformanceMetrics({
        userId: student1.id,
        userName: student1.fullName,
        academicProgress: 75,
        codingSkillRating: 70,
        problemsSolved: 12,
        contestsParticipated: 2,
        assignmentsCompleted: 8,
        quizzesCompleted: 5,
        averageScore: 85,
        placementReadinessIndex: 78
      });
      
      console.log("Demo data initialization complete!");
    }
  } catch (error) {
    console.error("Failed to initialize demo data:", error);
  }
}

// Helper function to hash passwords
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString("hex")}.${salt}`);
    });
  });
}
