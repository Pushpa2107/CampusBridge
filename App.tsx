import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import DashboardPage from "@/pages/dashboard-page";
import CoursesPage from "@/pages/courses-page";
import AssignmentsPage from "@/pages/assignments-page";
import AttendancePage from "@/pages/attendance-page";
import PracticePage from "@/pages/practice-page";
import CodeEditorPage from "@/pages/code-editor-page";
import LearningPathsPage from "@/pages/learning-paths-page";
import CodeRoomsPage from "@/pages/code-rooms-page";
import CodeHelpPage from "@/pages/code-help-page";
import CodeReviewPage from "@/pages/code-review-page";
import JobMatchPage from "@/pages/job-match-page";

// Faculty and Admin Panel Pages
import ContentManagementPage from "@/pages/faculty/content-management-page";
import PlacementPanelPage from "@/pages/admin/placement-panel-page";

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/courses" component={CoursesPage} />
      <ProtectedRoute path="/assignments" component={AssignmentsPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/practice" component={PracticePage} />
      <ProtectedRoute path="/practice/:id" component={CodeEditorPage} />
      <ProtectedRoute path="/learning-paths" component={LearningPathsPage} />
      <ProtectedRoute path="/code-rooms" component={CodeRoomsPage} />
      <ProtectedRoute path="/code-help" component={CodeHelpPage} />
      <ProtectedRoute path="/code-review" component={CodeReviewPage} />
      <ProtectedRoute path="/job-match" component={JobMatchPage} />
      
      {/* Faculty and Admin Panel Routes */}
      <ProtectedRoute path="/faculty/content-management" component={ContentManagementPage} />
      <ProtectedRoute path="/admin/placement-panel" component={PlacementPanelPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
