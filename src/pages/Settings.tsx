import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Shield, User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleGoBack = () => {
    navigate('/dashboard');
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 flex justify-between items-center">
          <Button 
            asChild
            variant="ghost" 
            size="icon"
            className="mr-2 text-blue-300 hover:text-blue-200 hover:bg-black/40"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-white ml-2">Settings</h1>
          <div></div> {/* Empty div for flex spacing */}
        </header>

        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
            <CardContent className="p-4">
              <div className="space-y-2 mt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-300 hover:bg-blue-900/30"
                  onClick={() => navigate('/account-settings')}
                >
                  <User className="mr-2 h-5 w-5" />
                  Account
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-300 hover:bg-blue-900/30"
                  onClick={() => navigate('/notification-settings')}
                >
                  <Bell className="mr-2 h-5 w-5" />
                  Notifications
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-300 hover:bg-blue-900/30"
                  onClick={() => navigate('/security-settings')}
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Security
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-300 hover:bg-blue-900/30"
                  onClick={() => navigate('/help')}
                >
                  <div className="rounded-full bg-gray-800 p-1 mr-2">
                    <span className="text-blue-300">?</span>
                  </div>
                  Help & Support
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-300 hover:bg-red-900/30 mt-6"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;