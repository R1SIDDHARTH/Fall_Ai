import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// This component handles both listing clips and playing videos within a single component
const Clips = () => {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

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
  }, []);

  // Handle selecting a clip to play
  const handlePlayClip = (clip) => {
    setSelectedClip({
      videoUrl: `http://localhost:5000${clip.url}`,
      videoTitle: clip.name,
      videoTime: `${clip.date} ${clip.time}`,
      duration: clip.duration
    });
  };

  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  // If a video is currently selected and playing
  if (selectedClip) {
    return (
      <div style={{ backgroundColor: "#1a1a2e", color: "#fff", minHeight: "100vh", padding: "20px" }}>
        {/* Back button */}
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={handleBackToDashboard}
            style={{
              backgroundColor: "#0d6efd",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span style={{ fontSize: "16px" }}>←</span>
            Back to Home
          </button>
        </div>

        {/* Video player section */}
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>{selectedClip.videoTitle}</h1>
          <p style={{ color: "#6c757d", marginBottom: "20px" }}>{selectedClip.videoTime}</p>
          
          {/* Video player */}
          <div style={{ backgroundColor: "#000", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
            <video
              ref={videoRef}
              controls
              width="100%"
              height="auto"
              style={{ display: "block" }}
              autoPlay
            >
              <source src={selectedClip.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          {/* Video info */}
          <div style={{ 
            backgroundColor: "#2f2f3d", 
            padding: "15px", 
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Video Information</h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(2, 1fr)", 
              gap: "10px",
              fontSize: "14px"
            }}>
              <div><strong>Filename:</strong> {selectedClip.videoTitle}</div>
              <div><strong>Recorded:</strong> {selectedClip.videoTime}</div>
              <div><strong>Duration:</strong> {selectedClip.duration}</div>
              <div><strong>Source:</strong> {selectedClip.videoUrl}</div>
            </div>
          </div>
          
          {/* Playback controls */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => videoRef.current?.play()}
              style={{
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Play
            </button>
            <button
              onClick={() => videoRef.current?.pause()}
              style={{
                backgroundColor: "#ffc107",
                color: "#000",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Pause
            </button>
            <button
              onClick={handleBackToDashboard}
              style={{
                backgroundColor: "#0d6efd",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default view - list of clips
  return (
    <div style={{ backgroundColor: "#1a1a2e", color: "#fff", minHeight: "100vh", padding: "20px" }}>
      {/* Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "20px" }}>
        <button
          onClick={handleBackToDashboard}
          style={{
            backgroundColor: "#0d6efd",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "16px" }}>←</span>
          Back to Home
        </button>
      </div>

      {/* Header Section */}
      <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>Video Clips</h1>
      <div style={{ marginBottom: "20px" }}>
        <span style={{ color: "#6c757d" }}>
          {loading 
            ? "Loading clips..." 
            : clips.length > 0 
              ? `${clips.length} Recorded Clips` 
              : "No clips available"}
        </span>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px" 
        }}>
          <div style={{ 
            border: "4px solid #f3f3f3", 
            borderTop: "4px solid #0d6efd", 
            borderRadius: "50%", 
            width: "40px", 
            height: "40px", 
            animation: "spin 2s linear infinite" 
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : error ? (
        // Error state
        <div style={{ 
          textAlign: "center", 
          padding: "30px", 
          backgroundColor: "#2f2f3d", 
          borderRadius: "8px" 
        }}>
          <p style={{ color: "#dc3545", marginBottom: "15px" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#0d6efd",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      ) : clips.length === 0 ? (
        // Empty state
        <div style={{ 
          textAlign: "center", 
          padding: "30px", 
          backgroundColor: "#2f2f3d", 
          borderRadius: "8px" 
        }}>
          <p>No video clips found</p>
        </div>
      ) : (
        // Clip grid
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {clips.map((clip) => (
            <div
              key={clip.url}
              style={{
                backgroundColor: "#2f2f3d",
                border: "1px solid #3d3f4b",
                borderRadius: "8px",
                width: "300px",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s ease-in-out",
              }}
              onClick={() => handlePlayClip(clip)}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div
                style={{
                  height: "150px",
                  backgroundColor: "#4a4e5e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                  color: "#fff",
                }}
              >
                ▶
              </div>
              <div style={{ padding: "15px" }}>
                <p style={{ 
                  fontSize: "16px", 
                  fontWeight: "500",
                  margin: "0 0 8px 0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {clip.name}
                </p>
                <p style={{ fontSize: "14px", color: "#adb5bd", margin: "0 0 10px 0" }}>
                  📅 {clip.date} 🕒 {clip.time}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6c757d", backgroundColor: "#1a1a2e", padding: "3px 8px", borderRadius: "4px" }}>
                    {clip.duration}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClip(clip);
                    }}
                    style={{
                      backgroundColor: "#0d6efd",
                      color: "#fff",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clips;