import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetLinkSent from "./pages/ResetLinkSent";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import AccountSettings from "./pages/AccountSettings";
import NotificationSettings from "./pages/NotificationSettings";
import SecuritySettings from "./pages/SecuritySettings";
import Help from "./pages/Help";
import Clips from "./pages/Clips";
import DeviceSetup from "./pages/DeviceSetup";

// Import with renamed components to match their actual content
import DashboardComponent from "./pages/Home"; // This file contains Dashboard content
import HomeComponent from "./pages/Dashboard"; // This file contains Home content

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-link-sent" element={<ResetLinkSent />} />
            <Route path="/device-setup" element={<DeviceSetup />} />
            
            {/* Protected routes with swapped components */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardComponent />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="/notification-settings" element={<NotificationSettings />} />
              <Route path="/security-settings" element={<SecuritySettings />} />
              <Route path="/home" element={<HomeComponent />} />
              <Route path="/help" element={<Help />} />
              <Route path="/clips" element={<Clips />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;