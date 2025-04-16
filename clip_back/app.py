from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime
import os
import cv2

# Configuration
VIDEO_FOLDER = r"C:\Users\siddh\Downloads\fall Ai"  # Update with your path

# Flask Setup
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/videos/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Helper: Get video duration (mm:ss)
def get_duration(filename):
    try:
        cap = cv2.VideoCapture(filename)
        if not cap.isOpened():
            return "00:00"
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        duration_sec = frames / fps if fps > 0 else 0
        
        minutes = int(duration_sec // 60)
        seconds = int(duration_sec % 60)
        
        cap.release()  # Important: release the capture object
        return f"{minutes:02}:{seconds:02}"
    except Exception as e:
        print(f"Error getting duration for {filename}: {e}")
        return "00:00"

# API: List videos
@app.route("/api/videos")
def list_videos():
    videos = []
    
    try:
        if not os.path.exists(VIDEO_FOLDER):
            print(f"Video folder does not exist: {VIDEO_FOLDER}")
            return jsonify([])
            
        for file in sorted(os.listdir(VIDEO_FOLDER), reverse=True):
            if not file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
                continue
                
            filepath = os.path.join(VIDEO_FOLDER, file)
            
            # Skip files that are too small (likely corrupt or incomplete)
            if not os.path.isfile(filepath) or os.path.getsize(filepath) < 1000:
                continue
                
            try:
                stat = os.stat(filepath)
                dt = datetime.fromtimestamp(stat.st_mtime)
                
                videos.append({
                    "name": file,
                    "url": f"/videos/{file}",
                    "date": dt.strftime("%Y-%m-%d"),
                    "time": dt.strftime("%I:%M %p"),
                    "duration": get_duration(filepath),
                    "size_mb": round(stat.st_size / (1024 * 1024), 2)
                })
            except Exception as e:
                print(f"Error processing {file}: {e}")
    except Exception as e:
        print(f"Error listing videos: {e}")
        
    return jsonify(videos)

# Route: Serve individual video files
@app.route("/videos/<path:filename>")
def serve_video(filename):
    return send_from_directory(VIDEO_FOLDER, filename)

# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "online"})

# Run server
if __name__ == "__main__":
    print(f"Starting server with video folder: {VIDEO_FOLDER}")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)