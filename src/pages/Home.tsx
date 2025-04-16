// cd "C:\ALL folder in dexstop\PycharmProjects\cctv_web_app\src"
// python server.py

// cd "C:\ALL folder in dexstop\PycharmProjects\cctv_web_app"
// npm run dev  

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, Home as HomeIcon, Film, MoreHorizontal } from 'lucide-react';

// Backend URL - match with other components
const BACKEND_URL = 'http://127.0.0.1:5000';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Navigate to home without forcing page reload
  const navigateToHome = (): void => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Fall Detection Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm px-2 py-1 rounded bg-green-500/20 text-green-400">
              System Online
            </div>
            <Link to="/settings">
              <Button variant="ghost" className="text-blue-300 hover:text-blue-200 hover:bg-black/40">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Camera Feed Card */}
        <div className="space-y-6">
          <Card 
            className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white"
            onClick={navigateToHome}
          >
            <div className="p-4 relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer transition-all hover:opacity-90" style={{ aspectRatio: '16/7' }}>
              <div className="absolute top-4 right-4">
                <Button 
                  variant="ghost" 
                  className="bg-black/60 text-white hover:text-blue-200 hover:bg-black/80 p-2 rounded-md border border-blue-400/30"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation(); // Prevent parent click
                  }}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center justify-center h-full">
                {/* CCTV thumbnail image */}
                <img 
                  src="https://sigmawire.net/i/03/Q8Ppr5.png" 
                  alt="CCTV Feed"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="absolute bottom-4 left-4">
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                  Front Door Camera
                </div>
              </div>

              <div className="absolute bottom-4 right-4">
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                  View Live Feed
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-blue-400/30 p-4 flex justify-around">
          <Button 
            variant="ghost" 
            className="text-blue-300 hover:text-blue-200 hover:bg-black/40 flex flex-col items-center"
            onClick={navigateToHome}
          >
            <HomeIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">Home</span>
          </Button>

          <Link to="/clips">
            <Button 
              variant="ghost" 
              className="text-blue-300 hover:text-blue-200 hover:bg-black/40 flex flex-col items-center"
            >
              <Film className="h-6 w-6 mb-1" />
              <span className="text-xs">Clips</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;