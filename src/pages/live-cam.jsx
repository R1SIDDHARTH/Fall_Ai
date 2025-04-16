import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import io from 'socket.io-client';

// This should match your Flask backend URL
const BACKEND_URL = 'http://127.0.0.1:5000';

// Custom interval hook
const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

const LiveCamera = () => {
  const [isArmed, setIsArmed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [fallDetected, setFallDetected] = useState(false);
  const [fallImage, setFallImage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const { toast } = useToast();
  const socketRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(BACKEND_URL);
    
    // Event handlers
    socketRef.current.on('connect', () => {
      setConnectionStatus('connected');
      toast({
        title: "Connected to Camera System",
        description: "Successfully connected to the fall detection system.",
      });
    });
    
    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Lost",
        description: "Lost connection to the camera system.",
        variant: "destructive",
      });
    });
    
    socketRef.current.on('fall_detected', (data) => {
      setFallDetected(true);
      setFallImage(`data:image/jpeg;base64,${data.image}`);
      
      toast({
        title: "⚠️ Fall Detected!",
        description: "A potential fall has been detected. Check the footage.",
        variant: "destructive",
        duration: 10000, // 10 seconds
      });
    });
    
    // Periodically check the backend status
    const checkStatus = setInterval(() => {
      if (connectionStatus === 'connected') {
        fetch(`${BACKEND_URL}/status`)
          .then(response => response.json())
          .then(data => {
            if (data.fall_detected && !fallDetected) {
              toast({
                title: "⚠️ Fall Detection Alert",
                description: "A fall has been detected! Check the video feed.",
                variant: "destructive",
                duration: 10000,
              });
              setFallDetected(true);
            }
          })
          .catch(err => {
            console.error("Error checking status:", err);
          });
      }
    }, 5000); // Check every 5 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(checkStatus);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [toast, connectionStatus, fallDetected]);

  const toggleArmed = (checked) => {
    setIsArmed(checked);
    
    // Notify the backend of the arm state change
    if (socketRef.current) {
      socketRef.current.emit('toggle_armed', { armed: checked });
    }
    
    if (checked) {
      setIsStreaming(false);
      toast({
        title: "System Armed",
        description: "Fall detection system is now active.",
      });
    } else {
      setIsStreaming(true);
      setFallDetected(false);
      setFallImage(null);
      if (socketRef.current) {
        socketRef.current.emit('reset_fall_alert');
      }
      toast({
        title: "System Disarmed",
        description: "Fall detection system has been deactivated.",
      });
    }
  };

  const dismissFallAlert = () => {
    setFallDetected(false);
    setFallImage(null);
    if (socketRef.current) {
      socketRef.current.emit('reset_fall_alert');
    }
  };

  useEffect(() => {
    // Set up video stream when streaming is enabled
    if (isStreaming && videoRef.current) {
      try {
        // The key to making this work is using an img tag with a src that points
        // to the video feed endpoint from the Flask server
        videoRef.current.src = `${BACKEND_URL}/video_feed`;
        videoRef.current.onerror = () => {
          setConnectionStatus('disconnected');
          toast({
            title: "Stream Error",
            description: "Failed to connect to the camera stream.",
            variant: "destructive",
          });
        };
      } catch (error) {
        console.error("Error setting up video stream:", error);
        setConnectionStatus('disconnected');
      }
    }
  }, [isStreaming, toast]);

  // Use interval to update the time display
  useInterval(() => {
    // This just forces a re-render to update the time display
    if (isStreaming) {
      const timeElement = document.getElementById('current-time');
      if (timeElement) {
        timeElement.innerText = new Date().toLocaleTimeString();
      }
    }
  }, 1000);

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
          {fallDetected ? (
            <Card className="bg-black/40 border border-red-500/60 backdrop-blur-sm text-white animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <h2 className="text-xl font-bold text-red-500">Fall Detected!</h2>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-950/30"
                    onClick={dismissFallAlert}
                  >
                    Dismiss Alert
                  </Button>
                </div>
                
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {fallImage && (
                    <img 
                      src={fallImage} 
                      alt="Fall Detection" 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                
                <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30 rounded-lg">
                  <p className="text-red-300">
                    A potential fall has been detected. Please check on the person to ensure they are safe.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isStreaming ? (
            <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
              <CardContent className="p-4">
                <div className="aspect-video relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="absolute top-4 left-4 bg-red-600 rounded-full w-3 h-3 animate-pulse"></div>
                  <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                    LIVE
                  </div>
                  {connectionStatus === 'connected' ? (
                    <img 
                      ref={videoRef}
                      alt="Live camera feed" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">
                        {connectionStatus === 'connecting' ? 'Connecting to camera...' : 'Camera disconnected'}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      Front Door Camera
                    </div>
                    <div id="current-time" className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      {new Date().toLocaleTimeString()}
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
                    Live camera streaming is paused while the system is armed.
                    <br />
                    The system will automatically record and alert if a fall is detected.
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
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">System Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Connection:</span>
                  <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
                    {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fall Detection:</span>
                  <span className={isArmed ? 'text-green-400' : 'text-gray-400'}>
                    {isArmed ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Streaming:</span>
                  <span className={isStreaming ? 'text-green-400' : 'text-gray-400'}>
                    {isStreaming ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">Instructions</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300 text-sm">
                <li>Toggle the switch to arm/disarm the fall detection system</li>
                <li>When armed, the system will automatically detect falls</li>
                <li>If a fall is detected, you'll receive an alert</li>
                <li>Check on the person if a fall is detected</li>
                <li>Video is recorded automatically when falls are detected</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveCamera;