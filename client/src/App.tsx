import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute, EMasterRoute, EToolRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AboutPage from "@/pages/about-page";
import ContactPage from "@/pages/contact-page";
import TermsPage from "@/pages/terms-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page"; // Página Início
import AdminPage from "@/pages/admin-page";
import AccountPage from "@/pages/account-page";
import CoursesPage from "@/pages/courses-page-new"; // Usando a nova versão da página de cursos
import CourseDetailPage from "@/pages/course-detail-page";
import ChatsPage from "@/pages/chats-page";
import ChatPage from "@/pages/chat-page";
import NewChatPage from "@/pages/new-chat-page";
import UpgradePage from "@/pages/upgrade-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/account" component={AccountPage} />
      <ProtectedRoute path="/chats" component={ChatsPage} />
      <ProtectedRoute path="/chat/new" component={NewChatPage} />
      <ProtectedRoute path="/chat/:id" component={ChatPage} />
      <ProtectedRoute path="/upgrade" component={UpgradePage} />
      <EMasterRoute path="/courses" component={CoursesPage} />
      <EMasterRoute path="/courses/:id" component={CourseDetailPage} />
      <AdminRoute path="/admin" component={AdminPage} />
      <AdminRoute path="/admin/chats" component={ChatsPage} />

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
