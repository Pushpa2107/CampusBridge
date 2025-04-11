// FACULTY/TRAINER PANEL ROUTES
  
// Course Content routes
app.get("/api/courses/:courseId/contents", async (req, res) => {
  try {
    const { courseId } = req.params;
    const contents = await storage.getCourseContentsByCourse(Number(courseId));
    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course contents" });
  }
});

app.post("/api/course-contents", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Only faculty and admins can manage course content" });
    }
    
    const contentData = req.body;
    
    const newContent = await storage.createCourseContent({
      ...contentData,
      createdBy: req.user.id
    });
    
    // Log activity
    await storage.createActivityLog({
      userId: req.user.id,
      activity: `Added new content to course: ${contentData.title}`,
      activityType: "teaching"
    });
    
    res.status(201).json(newContent);
  } catch (error) {
    res.status(500).json({ message: "Error creating course content" });
  }
});

app.patch("/api/course-contents/:id/publish", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Only faculty and admins can publish content" });
    }
    
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const updatedContent = await storage.updateCourseContentPublishStatus(Number(id), isPublished);
    
    if (!updatedContent) {
      return res.status(404).json({ message: "Content not found" });
    }
    
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: "Error updating content publish status" });
  }
});

// ADMIN/PLACEMENT PANEL ROUTES

// Coding Contest routes
app.get("/api/coding-contests", async (req, res) => {
  try {
    const contests = await storage.getCodingContests();
    res.json(contests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching coding contests" });
  }
});

app.post("/api/coding-contests", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Only admins can create coding contests" });
    }
    
    const contestData = req.body;
    
    const newContest = await storage.createCodingContest({
      ...contestData,
      createdBy: req.user.id
    });
    
    // Log activity
    await storage.createActivityLog({
      userId: req.user.id,
      activity: `Created new coding contest: ${contestData.title}`,
      activityType: "admin"
    });
    
    res.status(201).json(newContest);
  } catch (error) {
    res.status(500).json({ message: "Error creating coding contest" });
  }
});

// Student Performance Metrics routes
app.get("/api/student-performance", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // For students, return their own metrics
    if (req.user.role === 'student') {
      const metrics = await storage.getStudentPerformanceMetrics(req.user.id);
      return res.json(metrics);
    }
    
    // For faculty and admins, return all metrics
    if (req.user.role === 'faculty' || req.user.role === 'admin') {
      const metrics = await storage.getAllStudentPerformanceMetrics();
      return res.json(metrics);
    }
    
    res.status(403).json({ message: "Forbidden" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching performance metrics" });
  }
});

app.get("/api/top-performers", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const topPerformers = await storage.getTopPerformers(limit);
    res.json(topPerformers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching top performers" });
  }
});
