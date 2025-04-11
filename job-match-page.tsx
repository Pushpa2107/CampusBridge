import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layouts/main-layout';
import { Loader2, Briefcase, Send, Check, Award, BookOpen, Star, Lightbulb } from 'lucide-react';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const jobMatchFormSchema = z.object({
  skills: z.string().min(1, { message: 'Please enter your skills' }),
  interests: z.string().min(1, { message: 'Please enter your interests' }),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
});

type JobMatchFormValues = z.infer<typeof jobMatchFormSchema>;

interface JobRecommendation {
  title: string;
  match: number;
  description: string;
  requiredSkills: string[];
  salary: string;
}

interface CareerResponse {
  jobRecommendations: JobRecommendation[];
  technologiesToLearn: string[];
  careerPathAdvice: string;
  skillGaps: string[];
}

export default function JobMatchPage() {
  const { toast } = useToast();
  const [matchResults, setMatchResults] = useState<CareerResponse | null>(null);

  const form = useForm<JobMatchFormValues>({
    resolver: zodResolver(jobMatchFormSchema),
    defaultValues: {
      skills: '',
      interests: '',
      experience: 'beginner',
    },
  });

  const jobMatchMutation = useMutation({
    mutationFn: async (data: JobMatchFormValues) => {
      // Format skills and interests as arrays
      const formattedData = {
        ...data,
        skills: data.skills.split(',').map(s => s.trim()),
        interests: data.interests.split(',').map(i => i.trim()),
      };
      
      const response = await apiRequest('POST', '/api/job-match', formattedData);
      return response.json();
    },
    onSuccess: (data: CareerResponse) => {
      setMatchResults(data);
      toast({
        title: 'Job Matches Found',
        description: 'Check out your personalized career recommendations!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to get job matches: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: JobMatchFormValues) => {
    setMatchResults(null);
    jobMatchMutation.mutate(data);
  };

  return (
    <MainLayout>
      <div className="container p-6 mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Job Match</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Your Profile</CardTitle>
                <CardDescription>
                  Tell us about your skills and interests to get personalized job recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Skills</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="JavaScript, React, Node.js, SQL..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            List your technical skills, separated by commas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="interests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Interests</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Web development, AI, Cloud computing..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            List your career interests, separated by commas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                              <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                              <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={jobMatchMutation.isPending}
                    >
                      {jobMatchMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Find Job Matches
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {jobMatchMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full p-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Finding your perfect career match...</p>
                <p className="text-sm text-gray-500 text-center">Our AI is analyzing your skills and interests to recommend the best career paths.</p>
              </div>
            ) : matchResults ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-primary" />
                      Job Recommendations
                    </CardTitle>
                    <CardDescription>
                      Based on your skills and interests, here are the top job matches for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {matchResults.jobRecommendations.map((job, index) => (
                        <div 
                          key={index} 
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {job.match}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.requiredSkills.map((skill, i) => (
                              <span 
                                key={i} 
                                className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                          <div className="text-sm font-medium">
                            Salary Range: {job.salary}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                        Technologies to Learn
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {matchResults.technologiesToLearn.map((tech, index) => (
                          <div key={index} className="flex items-center">
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span>{tech}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                        <Award className="h-5 w-5 mr-2 text-yellow-500" />
                        Skill Gaps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {matchResults.skillGaps.map((gap, index) => (
                          <div key={index} className="flex items-center">
                            <Star className="h-4 w-4 mr-2 text-amber-500" />
                            <span>{gap}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-purple-500" />
                      Career Path Advice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p>{matchResults.careerPathAdvice}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 space-y-4 bg-gray-50 rounded-lg border border-dashed">
                <Briefcase className="h-16 w-16 text-gray-400" />
                <h3 className="text-xl font-medium">Discover Your Career Path</h3>
                <p className="text-center text-gray-500 max-w-md">
                  Fill out your skills profile to get AI-powered job recommendations tailored to your unique abilities and interests.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
