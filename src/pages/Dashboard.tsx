import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

// Backend URL - update this to match your Python server
const BACKEND_URL = 'http://127.0.0.1:5000';

// TypeScript interfaces
interface FallData {
  person_id: number;
  frame: number;
  time: string;
}

interface FallsResponse {
  status: string;
  falls: FallData[];
  count: number;
}

interface StatusResponse {
  armed: boolean;
  camera_active: boolean;
  fall_detection_active: boolean;
}

const Home: React.FC = () => {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [fallCount, setFallCount] = useState<number>(0);
  const [lastFallTime, setLastFallTime] = useState<string | null>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLImageElement>(null);
  const location = useLocation();
  const fallCheckIntervalRef = useRef<number | null>(null);
  const lastNotifiedFallTime = useRef<string | null>(null);
  
  // Force video reload without refreshing the page or restarting camera
  const reloadVideoFeed = (): void => {
    if (videoRef.current && isStreaming) {
      console.log("Reloading video feed element");
      if (videoRef.current.style) {
        videoRef.current.style.opacity = "0";
      }
      const timestamp = new Date().getTime();
      videoRef.current.src = `${BACKEND_URL}/video_feed?nocache=${timestamp}`;
      videoRef.current.onload = () => {
        if (videoRef.current && videoRef.current.style) {
          videoRef.current.style.opacity = "1";
        }
        console.log("Video feed reloaded successfully");
      };
    }
  };
  
  const toggleArmed = async (checked: boolean): Promise<void> => {
    setIsArmed(checked);
    setIsStreaming(!checked);
    try {
      const response = await fetch(`${BACKEND_URL}/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ armed: checked }),
      });
      if (!response.ok) {
        throw new Error("Failed to update mode");
      }
      if (checked) {
        toast({
          title: "System Armed",
          description: "Fall detection active. Live view hidden to save bandwidth.",
        });
      } else {
        toast({
          title: "System Disarmed",
          description: "Fall detection active with live view enabled.",
        });
        setTimeout(() => reloadVideoFeed(), 300);
      }
    } catch (error) {
      console.error("Error toggling mode:", error);
      toast({
        title: "Error",
        description: "Failed to change system mode. Please try again.",
        variant: "destructive",
      });
      setIsArmed(!checked);
      setIsStreaming(checked);
    }
  };

  const checkForFalls = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/falls`);
      if (response.ok) {
        const data: FallsResponse = await response.json();
        if (data.count !== fallCount) {
          setFallCount(data.count);
          if (data.falls && data.falls.length > 0) {
            const mostRecentFall = data.falls[data.falls.length - 1];
            setLastFallTime(mostRecentFall.time);
            if (mostRecentFall.time !== lastNotifiedFallTime.current) {
              toast({
                title: "⚠️ Fall Detected!",
                description: `A fall was detected at ${mostRecentFall.time}`,
                variant: "destructive",
                duration: 10000,
              });
              lastNotifiedFallTime.current = mostRecentFall.time;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking for falls:", error);
    }
  };

  useEffect(() => {
    const checkConnection = async (): Promise<void> => {
      try {
        setConnectionStatus('connecting');
        console.log("Checking backend connection");
        const response = await fetch(`${BACKEND_URL}/status`);
        if (response.ok) {
          const data: StatusResponse = await response.json();
          console.log("Backend connected, status:", data);
          if (data && typeof data.armed !== 'undefined') {
            setIsArmed(data.armed);
            setIsStreaming(!data.armed);
          }
          setConnectionStatus('connected');
          setTimeout(() => reloadVideoFeed(), 300);
          checkForFalls();
        } else {
          throw new Error("Backend responded with error");
        }
      } catch (error) {
        console.error("Error connecting to backend:", error);
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    const intervalId = setInterval(checkForFalls, 5000);
    fallCheckIntervalRef.current = intervalId;
    
    const pingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/ping`);
        if (response.ok) {
          if (connectionStatus !== 'connected') {
            setConnectionStatus('connected');
            reloadVideoFeed();
          }
        } else {
          throw new Error("Ping failed");
        }
      } catch (error) {
        console.error("Background ping failed:", error);
        if (connectionStatus === 'connected') {
          setConnectionStatus('disconnected');
        }
      }
    }, 30000);
    
    const timeInterval = setInterval(() => {
      const timeElement = document.getElementById('current-time');
      if (timeElement) {
        const now = new Date();
        timeElement.textContent = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      }
    }, 1000);
    
    return () => {
      if (fallCheckIntervalRef.current !== null) {
        clearInterval(fallCheckIntervalRef.current);
      }
      clearInterval(pingInterval);
      clearInterval(timeInterval);
    };
  }, []);

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
          
          <div className="text-lg font-semibold">Fall Detection System</div>
          
          <div className={`text-sm px-2 py-1 rounded ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' : 
            'bg-red-500/20 text-red-400'
          }`}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Disconnected'}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {isStreaming ? (
            <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
              <CardContent className="p-4">
                <div className="aspect-video relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="absolute top-4 left-4 bg-black/60 flex items-center justify-center p-1 rounded-md">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 bg-red-600/80 text-white text-xs px-2 py-1 rounded-md">
                    LIVE
                  </div>
                  
                  {connectionStatus === 'connected' ? (
                    <img 
                      ref={videoRef}
                      src={`${BACKEND_URL}/video_feed`}
                      alt="Live camera feed" 
                      className="w-full h-full object-cover transition-opacity duration-300"
                      style={{ opacity: 0 }}
                      onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.opacity = '1';
                        console.log("Video feed loaded");
                      }}
                      onError={() => {
                        console.error("Video feed error");
                        setConnectionStatus('disconnected');
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">
                        {connectionStatus === 'connecting' 
                          ? 'Camera stream connecting to Python backend...' 
                          : 'Camera disconnected. Check Python backend.'}
                      </p>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      Front Door Camera
                    </div>
                    <div id="current-time" className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 bg-black/40 rounded-lg p-3 border border-blue-400/30">
                  <span className="text-blue-300">{isArmed ? 'Armed' : 'Disarmed'}</span>
                  <Switch 
                    checked={isArmed} 
                    onCheckedChange={toggleArmed}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-black/40 border border-red-400/30 backdrop-blur-sm text-white">
              <CardContent className="p-4">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
                  <h3 className="text-xl font-bold text-white mb-2">System Armed</h3>
                  <p className="text-gray-400 text-center max-w-md">
                    Fall detection system is actively monitoring.
                    <br />
                    Live view is hidden to save bandwidth.
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-4 bg-black/40 rounded-lg p-3 border border-blue-400/30">
                  <span className="text-blue-300">{isArmed ? 'Armed' : 'Disarmed'}</span>
                  <Switch 
                    checked={isArmed} 
                    onCheckedChange={toggleArmed}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;