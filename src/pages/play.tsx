import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Maximize, Volume2, VolumeX } from "lucide-react";
import { PageHeader } from "@/components/page-header"; // Assuming you have this component

const Clips = () => {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Fetch clips from the server
    const fetchClips = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/api/videos");
        setClips(response.data);
      } catch (error) {
        console.error("Error fetching clips:", error);
        setError("Failed to fetch video clips. Please ensure the server is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchClips();
    
    // Clean up function to handle fullscreen changes
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  const handlePlayClip = (clip) => {
    setSelectedClip({
      videoUrl: `http://localhost:5000${clip.url}`,
      videoTitle: clip.name,
      videoTime: `${clip.date} ${clip.time}`,
      size: clip.size_mb ? `${clip.size_mb} MB` : undefined,
    });
  };

  const handleBackToClips = () => {
    setSelectedClip(null);
  };

  const toggleFullScreen = (videoElement) => {
    if (!document.fullscreenElement) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };
  
  const toggleMute = (videoElement) => {
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setIsMuted(videoElement.muted);
    }
  };

  // If a clip is selected, show the video player view
  if (selectedClip) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToClips}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clips
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">{selectedClip.videoTitle}</h1>
            <p className="text-muted-foreground">{selectedClip.videoTime}</p>
          </div>
        </div>
        
        <Card className="overflow-hidden mb-6">
          <div className="relative bg-black">
            <video 
              className="w-full h-auto" 
              controls
              autoPlay
              id="videoPlayer"
            >
              <source src={selectedClip.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={() => toggleMute(document.getElementById('videoPlayer'))}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={() => toggleFullScreen(document.getElementById('videoPlayer'))}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-medium mb-2">Video Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Filename:</span> {selectedClip.videoTitle}
              </div>
              <div>
                <span className="font-medium">Recorded:</span> {selectedClip.videoTime}
              </div>
              {selectedClip.size && (
                <div>
                  <span className="font-medium">Size:</span> {selectedClip.size}
                </div>
              )}
              <div className="md:col-span-2">
                <span className="font-medium">Source:</span> {selectedClip.videoUrl}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no clip is selected, show the clips list
  return (
    <div className="container mx-auto p-4">
      <PageHeader 
        title="Recorded Clips" 
        description="View and play your recorded security footage"
      />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <h3 className="text-lg font-medium text-destructive">{error}</h3>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : clips.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <h3 className="text-lg font-medium">No clips found</h3>
          <p className="text-muted-foreground mt-2">
            There are no recorded clips available at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {clips.map((clip) => (
            <Card 
              key={clip.url} 
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePlayClip(clip)}
            >
              <div className="bg-secondary/20 aspect-video flex items-center justify-center">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-black/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-medium truncate" title={clip.name}>
                  {clip.name}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-2">
                  <span>{clip.date}</span>
                  <span>•</span>
                  <span>{clip.time}</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {clip.duration}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClip(clip);
                    }}
                  >
                    Play
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clips;