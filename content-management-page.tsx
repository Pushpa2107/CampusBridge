import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  PlusCircle, 
  FileText, 
  Video, 
  ClipboardList, 
  Upload, 
  Eye, 
  EyeOff, 
  Edit
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layouts/main-layout';

// Content form schema
const contentFormSchema = z.object({
  courseId: z.string().min(1, { message: "Course is required" }),
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  contentType: z.enum(["pdf", "video", "quiz", "other"]),
  contentUrl: z.string().url({ message: "Valid URL is required" }),
  order: z.string().transform(val => parseInt(val, 10)),
  isPublished: z.boolean().default(false)
});

// Assignment form schema
const assignmentFormSchema = z.object({
  courseId: z.string().min(1, { message: "Course is required" }),
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  difficulty: z.enum(["easy", "medium", "hard"]),
  deadline: z.string().min(1, { message: "Deadline is required" }),
  maxScore: z.string().transform(val => parseInt(val, 10)),
  instructions: z.string().min(1, { message: "Instructions are required" }),
  testCases: z.string().min(1, { message: "Test cases are required" }),
  isPublished: z.boolean().default(false)
});

type ContentFormValues = z.infer<typeof contentFormSchema>;
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

export default function ContentManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Fetch courses for faculty
  const { data: courses = [] } = useQuery({
    queryKey: ['/api/courses'],
    refetchOnWindowFocus: false,
  });

  // Filter courses where user is instructor
  const myCourses = courses.filter(course => course.instructorId === user?.id);

  // Fetch course contents based on selected course
  const { data: courseContents = [], isLoading: isLoadingContents } = useQuery({
    queryKey: ['/api/courses', selectedCourseId, 'contents'],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${selectedCourseId}/contents`);
      if (!res.ok) throw new Error('Failed to fetch course contents');
      return res.json();
    }
  });

  // Fetch assignments based on selected course
  const { data: courseAssignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['/api/courses', selectedCourseId, 'assignments'],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${selectedCourseId}/assignments`);
      if (!res.ok) throw new Error('Failed to fetch course assignments');
      return res.json();
    }
  });

  // Content form
  const contentForm = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      courseId: selectedCourseId || "",
      title: "",
      description: "",
      contentType: "pdf",
      contentUrl: "",
      order: "1",
      isPublished: false
    }
  });

  // Assignment form
  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      courseId: selectedCourseId || "",
      title: "",
      description: "",
      difficulty: "medium",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxScore: "100",
      instructions: "",
      testCases: JSON.stringify([
        { input: "example input", expectedOutput: "example output" }
      ], null, 2),
      isPublished: false
    }
  });

  // Update form default values when selected course changes
  React.useEffect(() => {
    if (selectedCourseId) {
      contentForm.setValue('courseId', selectedCourseId);
      assignmentForm.setValue('courseId', selectedCourseId);
    }
  }, [selectedCourseId, contentForm, assignmentForm]);

  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: async (data: ContentFormValues) => {
      const res = await apiRequest('POST', '/api/course-contents', {
        ...data,
        courseId: parseInt(data.courseId)
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourseId, 'contents'] });
      setIsContentDialogOpen(false);
      contentForm.reset();
      toast({
        title: "Success",
        description: "Course content created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create content: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormValues) => {
      // Parse test cases JSON string to object
      let testCasesObj;
      try {
        testCasesObj = JSON.parse(data.testCases);
      } catch (e) {
        throw new Error("Invalid test cases JSON format");
      }

      const res = await apiRequest('POST', '/api/coding-assignments', {
        ...data,
        courseId: parseInt(data.courseId),
        testCases: testCasesObj
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourseId, 'assignments'] });
      setIsAssignmentDialogOpen(false);
      assignmentForm.reset();
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create assignment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Toggle content publish status
  const toggleContentPublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number, isPublished: boolean }) => {
      const res = await apiRequest('PATCH', `/api/course-contents/${id}/publish`, { isPublished });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourseId, 'contents'] });
      toast({
        title: "Success",
        description: "Content publish status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update publish status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Toggle assignment publish status
  const toggleAssignmentPublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number, isPublished: boolean }) => {
      const res = await apiRequest('PATCH', `/api/coding-assignments/${id}/publish`, { isPublished });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourseId, 'assignments'] });
      toast({
        title: "Success",
        description: "Assignment publish status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update publish status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle content form submission
  const onContentSubmit = (data: ContentFormValues) => {
    createContentMutation.mutate(data);
  };

  // Handle assignment form submission
  const onAssignmentSubmit = (data: AssignmentFormValues) => {
    createAssignmentMutation.mutate(data);
  };

  // Get content type icon
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 mr-1" />;
      case 'video':
        return <Video className="w-4 h-4 mr-1" />;
      case 'quiz':
        return <ClipboardList className="w-4 h-4 mr-1" />;
      default:
        return <FileText className="w-4 h-4 mr-1" />;
    }
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || (user.role !== 'faculty' && user.role !== 'admin')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container p-6 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Faculty Content Management</h1>
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">Select Course:</label>
          <Select
            value={selectedCourseId || ""}
            onValueChange={(value) => setSelectedCourseId(value)}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {myCourses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourseId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="content">Course Content</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Course Content</h2>
                <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Add New Course Content</DialogTitle>
                      <DialogDescription>
                        Create new content for your course. Add details and publish when ready.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...contentForm}>
                      <form onSubmit={contentForm.handleSubmit(onContentSubmit)} className="space-y-4">
                        <FormField
                          control={contentForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Content title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Content description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={contentForm.control}
                            name="contentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="quiz">Quiz</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contentForm.control}
                            name="order"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Order</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={contentForm.control}
                          name="contentUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/content" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL to the content file (PDF, video, etc.)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contentForm.control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Publish immediately</FormLabel>
                                <FormDescription>
                                  If unchecked, the content will be saved as draft.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createContentMutation.isPending}
                          >
                            {createContentMutation.isPending ? "Creating..." : "Create Content"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingContents ? (
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : courseContents.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-gray-50">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold">No content yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first course content.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courseContents.map((content) => (
                    <Card key={content.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            {getContentTypeIcon(content.contentType)}
                            <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                              {content.contentType.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={content.isPublished ? "Unpublish" : "Publish"}
                              onClick={() => toggleContentPublishMutation.mutate({
                                id: content.id,
                                isPublished: !content.isPublished
                              })}
                            >
                              {content.isPublished ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg mt-2">{content.title}</CardTitle>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>Order: {content.order}</span>
                          <span className="mx-2">•</span>
                          <span>{content.isPublished ? "Published" : "Draft"}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2">
                          {content.description || "No description provided"}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(content.contentUrl, "_blank")}
                        >
                          View Content
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Coding Assignments</h2>
                <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create Coding Assignment</DialogTitle>
                      <DialogDescription>
                        Create a new coding assignment for your students. Add details, instructions, and test cases.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...assignmentForm}>
                      <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                        <FormField
                          control={assignmentForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Assignment title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={assignmentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Assignment description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={assignmentForm.control}
                            name="difficulty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Difficulty</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select difficulty" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={assignmentForm.control}
                            name="deadline"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deadline</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={assignmentForm.control}
                            name="maxScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Score</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="100"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={assignmentForm.control}
                          name="instructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Detailed instructions for the assignment..."
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={assignmentForm.control}
                          name="testCases"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Cases (JSON format)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder='[{"input": "example input", "expectedOutput": "example output"}]'
                                  className="min-h-[100px] font-mono text-sm"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Enter test cases in JSON format. Each case should have input and expectedOutput.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={assignmentForm.control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Publish immediately</FormLabel>
                                <FormDescription>
                                  If unchecked, the assignment will be saved as draft.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createAssignmentMutation.isPending}
                          >
                            {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingAssignments ? (
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : courseAssignments.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-gray-50">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold">No assignments yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first coding assignment.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {courseAssignments.map((assignment) => (
                    <Card key={assignment.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(assignment.difficulty)}`}>
                            {assignment.difficulty.toUpperCase()}
                          </span>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={assignment.isPublished ? "Unpublish" : "Publish"}
                              onClick={() => toggleAssignmentPublishMutation.mutate({
                                id: assignment.id,
                                isPublished: !assignment.isPublished
                              })}
                            >
                              {assignment.isPublished ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg mt-2">{assignment.title}</CardTitle>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Points: {assignment.maxScore}</span>
                          <span className="mx-2">•</span>
                          <span>{assignment.isPublished ? "Published" : "Draft"}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2">
                          {assignment.description}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          View Submissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
