import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layouts/main-layout';
import { Loader2, HelpCircle, Send } from 'lucide-react';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'typescript', label: 'TypeScript' },
];

const codeHelpFormSchema = z.object({
  code: z.string().min(1, { message: 'Please provide some code' }),
  question: z.string().min(1, { message: 'Please ask a question about your code' }),
  language: z.string().min(1, { message: 'Please select a language' }),
});

type CodeHelpFormValues = z.infer<typeof codeHelpFormSchema>;

export default function CodeHelpPage() {
  const { toast } = useToast();
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const form = useForm<CodeHelpFormValues>({
    resolver: zodResolver(codeHelpFormSchema),
    defaultValues: {
      code: '',
      question: '',
      language: 'javascript',
    },
  });

  const codeHelpMutation = useMutation({
    mutationFn: async (data: CodeHelpFormValues) => {
      const response = await apiRequest('POST', '/api/code-help', data);
      return response.json();
    },
    onSuccess: (data) => {
      setAiResponse(data.answer);
      toast({
        title: 'AI Response Ready',
        description: 'Check out the AI response below!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to get AI help: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CodeHelpFormValues) => {
    setAiResponse(null);
    codeHelpMutation.mutate(data);
  };

  return (
    <MainLayout>
      <div className="container p-6 mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Code Help</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Ask Your Coding Question</CardTitle>
                <CardDescription>
                  Share your code and ask specific questions to get personalized help
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Programming Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languageOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Code</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Paste your code here..."
                              className="min-h-[200px] font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="question"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Question</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What would you like help with? Be specific..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={codeHelpMutation.isPending}
                    >
                      {codeHelpMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Asking AI...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Get AI Help
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">AI Response</CardTitle>
                <CardDescription>
                  Personalized guidance for your coding questions
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[300px]">
                {codeHelpMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-gray-500">Analyzing your code and preparing response...</p>
                  </div>
                ) : aiResponse ? (
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap">{aiResponse}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-400">
                    <HelpCircle className="h-16 w-16" />
                    <p className="text-center">Ask a question about your code to get AI assistance</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 text-xs text-gray-500">
                AI responses are generated based on your specific code and question. For the best results, provide detailed context.
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
