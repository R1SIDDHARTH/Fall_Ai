
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const NotificationSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(user?.notifications || false);
  const [isNotificationSaved, setIsNotificationSaved] = useState(true);

  const handleGoBack = () => {
    navigate('/settings');
  };

  const handleNotificationChange = (checked: boolean) => {
    setNotifications(checked);
    setIsNotificationSaved(false);
  };

  const handleSaveNotifications = () => {
    updateUserProfile({ notifications });
    setIsNotificationSaved(true);
    
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 flex items-center">
          <Button 
            onClick={handleGoBack} 
            variant="ghost" 
            size="icon"
            className="mr-2 text-blue-300 hover:text-blue-200 hover:bg-black/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
        </header>

        <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
          <CardHeader>
            <CardTitle className="text-blue-300">Notification Settings</CardTitle>
            <CardDescription className="text-blue-100/70">
              Manage how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-300" />
                  <Label htmlFor="notifications" className="text-blue-200">Enable Notifications</Label>
                </div>
                <Switch 
                  id="notifications"
                  checked={notifications} 
                  onCheckedChange={handleNotificationChange}
                />
              </div>
              <p className="text-blue-100/70 text-sm mt-2">
                {notifications 
                  ? "You will receive notifications about important events." 
                  : "You will not receive any notifications."}
              </p>
              <Button 
                onClick={handleSaveNotifications}
                variant="outline" 
                size="sm" 
                className="mt-4 bg-black/20 border-blue-400/50 text-blue-300 hover:bg-black/40"
                disabled={isNotificationSaved}
              >
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
