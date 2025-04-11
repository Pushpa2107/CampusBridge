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
  Trophy, 
  Users, 
  Calendar,
  BarChart,
  ChevronUp,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Edit,
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
import { Progress } from "@/components/ui/progress";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layouts/main-layout';

// Contest form schema
const contestFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  problems: z.string().min(1, { message: "Problems selection is required" }),
  rules: z.string().min(1, { message: "Rules are required" }),
  isPublished: z.boolean().default(false)
});

type ContestFormValues = z.infer<typeof contestFormSchema>;

export default function PlacementPanelPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contests");
  const [isContestDialogOpen, setIsContestDialogOpen] = useState(false);

  // Fetch coding contests
  const { data: codingContests = [], isLoading: isLoadingContests } = useQuery({
    queryKey: ['/api/coding-contests'],
    refetchOnWindowFocus: false,
  });

  // Fetch coding problems for contest creation
  const { data: codingProblems = [] } = useQuery({
    queryKey: ['/api/problems'],
    refetchOnWindowFocus: false,
  });

  // Fetch student performance metrics
  const { data: performanceMetrics = [], isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/student-performance'],
    refetchOnWindowFocus: false,
    enabled: user?.role === 'admin',
  });

  // Fetch top performers
  const { data: topPerformers = [], isLoading: isLoadingTopPerformers } = useQuery({
    queryKey: ['/api/top-performers'],
    queryFn: async () => {
      const res = await fetch('/api/top-performers?limit=10');
      if (!res.ok) throw new Error('Failed to fetch top performers');
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // Contest form
  const contestForm = useForm<ContestFormValues>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('.')[0].slice(0, 16),
      endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('.')[0].slice(0, 16),
      problems: JSON.stringify([]),
      rules: "",
      isPublished: false
    }
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async (data: ContestFormValues) => {
      // Parse problems JSON string to object
      let problemsArray;
      try {
        problemsArray = JSON.parse(data.problems);
      } catch (e) {
        throw new Error("Invalid problems JSON format");
      }

      const res = await apiRequest('POST', '/api/coding-contests', {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        problems: problemsArray
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coding-contests'] });
      setIsContestDialogOpen(false);
      contestForm.reset();
      toast({
        title: "Success",
        description: "Coding contest created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create contest: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Toggle contest publish status
  const toggleContestPublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number, isPublished: boolean }) => {
      const res = await apiRequest('PATCH', `/api/coding-contests/${id}/publish`, { isPublished });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coding-contests'] });
      toast({
        title: "Success",
        description: "Contest publish status updated",
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

  // Handle contest form submission
  const onContestSubmit = (data: ContestFormValues) => {
    createContestMutation.mutate(data);
  };

  // Add/remove problem from contest form
  const toggleProblemSelection = (problemId: number) => {
    const currentProblems = JSON.parse(contestForm.getValues('problems') || '[]');
    
    if (currentProblems.includes(problemId)) {
      // Remove problem
      const updatedProblems = currentProblems.filter((id: number) => id !== problemId);
      contestForm.setValue('problems', JSON.stringify(updatedProblems));
    } else {
      // Add problem
      currentProblems.push(problemId);
      contestForm.setValue('problems', JSON.stringify(currentProblems));
    }
  };

  // Calculate placement readiness classification
  const getReadinessClass = (score: number) => {
    if (score >= 80) return { class: 'bg-green-100 text-green-800', label: 'Ready' };
    if (score >= 60) return { class: 'bg-yellow-100 text-yellow-800', label: 'Almost Ready' };
    return { class: 'bg-red-100 text-red-800', label: 'Needs Improvement' };
  };

  if (!user || user.role !== 'admin') {
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
          <h1 className="text-3xl font-bold">Admin Placement Panel</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="contests">Coding Contests</TabsTrigger>
            <TabsTrigger value="metrics">Student Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="contests" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Coding Contests</h2>
              <Dialog open={isContestDialogOpen} onOpenChange={setIsContestDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Contest
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>Create Coding Contest</DialogTitle>
                    <DialogDescription>
                      Create a new coding contest for students. Set up details, rules, and select problems.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...contestForm}>
                    <form onSubmit={contestForm.handleSubmit(onContestSubmit)} className="space-y-4">
                      <FormField
                        control={contestForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Contest title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contestForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Contest description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={contestForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contestForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={contestForm.control}
                        name="rules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contest Rules</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Contest rules and guidelines..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <FormLabel>Select Problems</FormLabel>
                        <div className="border rounded-md p-4 mt-1 max-h-[200px] overflow-y-auto">
                          {codingProblems.length === 0 ? (
                            <p className="text-sm text-gray-500">No problems available</p>
                          ) : (
                            <div className="space-y-2">
                              {codingProblems.map((problem) => {
                                const selectedProblems = JSON.parse(contestForm.getValues('problems') || '[]');
                                const isSelected = selectedProblems.includes(problem.id);
                                
                                return (
                                  <div 
                                    key={problem.id} 
                                    className={`flex items-center justify-between p-2 rounded-md ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-50'}`}
                                  >
                                    <div>
                                      <div className="font-medium text-sm">{problem.title}</div>
                                      <div className="text-xs text-gray-500">
                                        {problem.difficulty} • {problem.topics.join(', ')}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleProblemSelection(problem.id)}
                                    >
                                      {isSelected ? 'Selected' : 'Select'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <FormMessage>{contestForm.formState.errors.problems?.message}</FormMessage>
                      </div>
                      <FormField
                        control={contestForm.control}
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
                                If unchecked, the contest will be saved as draft.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createContestMutation.isPending}
                        >
                          {createContestMutation.isPending ? "Creating..." : "Create Contest"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingContests ? (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : codingContests.length === 0 ? (
              <div className="text-center p-8 border rounded-lg bg-gray-50">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No contests yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first coding contest.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {codingContests.map((contest) => {
                  const startDate = new Date(contest.startTime);
                  const endDate = new Date(contest.endTime);
                  const isUpcoming = startDate > new Date();
                  const isOngoing = startDate <= new Date() && endDate >= new Date();
                  const isPast = endDate < new Date();
                  
                  let statusBadge;
                  if (isUpcoming) {
                    statusBadge = <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">Upcoming</span>;
                  } else if (isOngoing) {
                    statusBadge = <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">Ongoing</span>;
                  } else if (isPast) {
                    statusBadge = <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">Completed</span>;
                  }
                  
                  return (
                    <Card key={contest.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            {statusBadge}
                            {!contest.isPublished && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">Draft</span>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={contest.isPublished ? "Unpublish" : "Publish"}
                              onClick={() => toggleContestPublishMutation.mutate({
                                id: contest.id,
                                isPublished: !contest.isPublished
                              })}
                              disabled={isOngoing || isPast}
                            >
                              {contest.isPublished ? (
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
                              disabled={isOngoing || isPast}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg mt-2">{contest.title}</CardTitle>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            {startDate.toLocaleString()} - {endDate.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2 mb-2">
                          {contest.description}
                        </CardDescription>
                        <div className="text-xs">
                          <span className="font-medium">Problems:</span>{" "}
                          {contest.problems.length} problems selected
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          {isPast ? "View Results" : "View Registrations"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTopPerformers ? (
                    <div className="flex justify-center my-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : topPerformers.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-sm text-gray-500">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topPerformers.map((student, index) => (
                        <div key={student.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              <span className="font-semibold text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{student.userName || `Student ${student.userId}`}</p>
                              <div className="text-xs text-gray-500">
                                Problems: {student.problemsSolved} • Score: {student.averageScore}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getReadinessClass(student.placementReadinessIndex).class}`}>
                              {getReadinessClass(student.placementReadinessIndex).label}
                            </span>
                            <div className="mt-1">
                              <Progress value={student.placementReadinessIndex} className="h-1.5 w-24" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    View Full Leaderboard
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-blue-500" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMetrics ? (
                    <div className="flex justify-center my-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : performanceMetrics.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-sm text-gray-500">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500">Average Readiness</p>
                          <p className="text-2xl font-bold mt-1">
                            {Math.round(performanceMetrics.reduce((sum, student) => 
                              sum + student.placementReadinessIndex, 0) / performanceMetrics.length)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500">Ready Students</p>
                          <p className="text-2xl font-bold mt-1">
                            {performanceMetrics.filter(s => s.placementReadinessIndex >= 80).length}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Academic Progress</span>
                          <span className="font-medium">
                            {Math.round(performanceMetrics.reduce((sum, s) => sum + s.academicProgress, 0) / performanceMetrics.length)}%
                          </span>
                        </div>
                        <Progress value={performanceMetrics.reduce((sum, s) => sum + s.academicProgress, 0) / performanceMetrics.length} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Coding Skill Rating</span>
                          <span className="font-medium">
                            {Math.round(performanceMetrics.reduce((sum, s) => sum + s.codingSkillRating, 0) / performanceMetrics.length)}%
                          </span>
                        </div>
                        <Progress value={performanceMetrics.reduce((sum, s) => sum + s.codingSkillRating, 0) / performanceMetrics.length} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Contest Participation</span>
                          <span className="font-medium">
                            {Math.round(performanceMetrics.reduce((sum, s) => sum + (s.contestsParticipated > 0 ? 100 : 0), 0) / performanceMetrics.length)}%
                          </span>
                        </div>
                        <Progress value={performanceMetrics.reduce((sum, s) => sum + (s.contestsParticipated > 0 ? 100 : 0), 0) / performanceMetrics.length} className="h-2" />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-500" />
                  Student Performance Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMetrics ? (
                  <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : performanceMetrics.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500">No performance data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 font-medium">Student</th>
                          <th className="text-center py-3 font-medium">Academic Progress</th>
                          <th className="text-center py-3 font-medium">Coding Skill</th>
                          <th className="text-center py-3 font-medium">Problems Solved</th>
                          <th className="text-center py-3 font-medium">Avg. Score</th>
                          <th className="text-center py-3 font-medium">Readiness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceMetrics.sort((a, b) => b.placementReadinessIndex - a.placementReadinessIndex).map((student) => {
                          const readiness = getReadinessClass(student.placementReadinessIndex);
                          
                          return (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="py-3">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                    {student.userName?.charAt(0) || 'S'}
                                  </div>
                                  <span>{student.userName || `Student ${student.userId}`}</span>
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">{student.academicProgress}%</span>
                                  <Progress value={student.academicProgress} className="h-2 w-16" />
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">{student.codingSkillRating}%</span>
                                  <Progress value={student.codingSkillRating} className="h-2 w-16" />
                                </div>
                              </td>
                              <td className="py-3 text-center">{student.problemsSolved}</td>
                              <td className="py-3 text-center">{student.averageScore}</td>
                              <td className="py-3 text-center">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${readiness.class}`}>
                                  {readiness.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm">
                  View Detailed Reports
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
