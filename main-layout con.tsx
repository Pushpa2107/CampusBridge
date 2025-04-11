import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  ChevronDown,
  LogOut,
  Menu,
  User,
  BookOpen,
  ListChecks,
  Clock,
  Code,
  BookMarked,
  Users,
  MessageSquareCode,
  HelpCircle,
  FileCheck,
  Briefcase,
  LayoutDashboard,
  FileText,
  Trophy,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: 'Courses',
      href: '/courses',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: 'Assignments',
      href: '/assignments',
      icon: <ListChecks className="h-5 w-5" />,
    },
    {
      title: 'Attendance',
      href: '/attendance',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: 'Practice',
      href: '/practice',
      icon: <Code className="h-5 w-5" />,
    },
    {
      title: 'Learning Paths',
      href: '/learning-paths',
      icon: <BookMarked className="h-5 w-5" />,
    },
    {
      title: 'Code Rooms',
      href: '/code-rooms',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'AI Code Help',
      href: '/code-help',
      icon: <HelpCircle className="h-5 w-5" />,
    },
    {
      title: 'Code Review',
      href: '/code-review',
      icon: <FileCheck className="h-5 w-5" />,
    },
    {
      title: 'Job Match',
      href: '/job-match',
      icon: <Briefcase className="h-5 w-5" />,
    },
    // Faculty panel links
    {
      title: 'Content Management',
      href: '/faculty/content-management',
      icon: <FileText className="h-5 w-5" />,
      roles: ['faculty', 'admin'],
    },
    // Admin panel links
    {
      title: 'Placement Panel',
      href: '/admin/placement-panel',
      icon: <Trophy className="h-5 w-5" />,
      roles: ['admin'],
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    item => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w[300px]">
                <div className="px-2 py-6">
                  <Link href="/">
                    <div className="flex items-center mb-6">
                      <MessageSquareCode className="h-6 w-6 text-primary mr-2" />
                      <span className="font-bold text-xl">Campus Bridge</span>
                    </div>
                  </Link>
                  <nav className="space-y-1">
                    {filteredNavItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                            location === item.href
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon}
                          <span className="ml-3">{item.title}</span>
                        </a>
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/">
              <div className="flex items-center">
                <MessageSquareCode className="h-6 w-6 text-primary mr-2" />
                <span className="font-bold text-xl hidden sm:inline-block">Campus Bridge</span>
              </div>
            </Link>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 hidden md:inline-block">
                {user.role === 'admin' ? (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 uppercase">Admin</span>
                ) : user.role === 'faculty' ? (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 uppercase">Faculty</span>
                ) : (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2 uppercase">Student</span>
                )}
                {user.fullName}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImage} alt={user.username} />
                      <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/profile">
                      <div className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/settings">
                      <div className="flex w-full items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/auth">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar - desktop only */}
        {user && (
          <aside className="w-64 bg-white border-r hidden md:block p-4">
            <nav className="space-y-1 sticky top-20">
              {filteredNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      location === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </a>
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
