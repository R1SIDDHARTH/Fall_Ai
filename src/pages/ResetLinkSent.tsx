import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ResetLinkSent = () => {
  const navigate = useNavigate();

  const handleReturnToLogin = () => {
    navigate('/login');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: 'url("/lovable-uploads/24864662-74cf-48bb-8c67-8791e6431f8b.png")' }}
    >
      <Card className="w-full max-w-md shadow-2xl bg-black/40 backdrop-blur-sm border border-blue-400/30">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-white"></CardTitle>
          
          <div className="flex justify-center my-6">
            <div className="rounded-full overflow-hidden border-4 border-blue-400 shadow-lg shadow-blue-500/50 w-48 h-48 flex items-center justify-center bg-black/30">
              <img 
                src="https://sigmawire.net/i/03/BDPOSG.png" 
                alt="Live-Care"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <CardTitle className="text-xl font-semibold text-white">Reset Link Sent</CardTitle>
          
          <CardDescription className="text-blue-200 mt-4">
            A password reset link has been sent to your email address. You can now close this browser safely.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button 
            onClick={handleReturnToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
          >
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetLinkSent;