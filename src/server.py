# server.py
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import threading
import time
from fall_detector import FallDetector  # Import our FallDetector class

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
camera = None
camera_lock = threading.Lock()
is_armed = False
camera_stream_active = True
fall_detection_active = True
fall_detector = None  # Initialize later
frame_count = 0
last_fall_time = 0
fall_cooldown = 10  # seconds between fall alerts


# IMPORTANT: Global stream generator - ensures the camera stream is persistent
# and doesn't restart when clients reconnect
def get_global_stream_generator():
    global camera, fall_detector, frame_count

    # Initialize camera only once at startup
    with camera_lock:
        if camera is None:
            print("Initializing camera...")
            camera = cv2.VideoCapture(1)  # Use 0 for default camera
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

            # Check if camera is opened successfully
            if not camera.isOpened():
                print("Error: Could not open camera.")

    # Initialize fall detector if not already done
    if fall_detector is None:
        fall_detector = FallDetector()

    # Create a single generator that will be shared across all clients
    def generate_frames():
        global camera, is_armed, fall_detector, frame_count, last_fall_time

        print("Stream generator started")
        last_frame_time = time.time()
        error_count = 0

        while True:
            # Check if we need to limit frame rate when armed
            # This saves CPU and bandwidth
            current_time = time.time()
            if (
                is_armed and (current_time - last_frame_time) < 0.1
            ):  # Limit to 10 fps when armed
                time.sleep(0.01)
                continue

            last_frame_time = current_time

            # Access camera with lock to prevent concurrent access
            with camera_lock:
                if camera is None or not camera.isOpened():
                    print("Camera disconnected, attempting to reinitialize...")
                    try:
                        if camera is not None:
                            camera.release()
                        camera = cv2.VideoCapture(0)
                        if not camera.isOpened():
                            error_count += 1
                            if error_count > 5:
                                print(
                                    "Failed to reconnect camera after multiple attempts"
                                )
                                time.sleep(1)
                                continue
                    except Exception as e:
                        print(f"Error reinitializing camera: {e}")
                        time.sleep(1)
                        continue

                # Try to read a frame
                success, frame = camera.read()

                if not success:
                    error_count += 1
                    print(f"Failed to read frame (attempt {error_count})")
                    if error_count > 5:
                        time.sleep(1)
                    continue

                error_count = 0  # Reset error count on successful frame
                frame_count += 1  # Increment frame counter

                # Process frame for fall detection
                try:
                    # Always process frames for fall detection regardless of armed/disarmed state
                    processed_frame, fall_detected = fall_detector.process_frame(
                        frame,
                        frame_count,
                        None,  # No video path for live camera
                        show_display=True,  # Always show visual feedback
                    )

                    # Check for fall with cooldown to prevent multiple alerts
                    if fall_detected and (
                        current_time - last_fall_time > fall_cooldown
                    ):
                        last_fall_time = current_time
                        print(f"⚠️ Fall detected at {time.strftime('%H:%M:%S')}")
                        # Here you could add code to send alerts via email, SMS, etc.

                except Exception as e:
                    print(f"Error processing frame for fall detection: {e}")
                    processed_frame = frame

                    # Add error message to frame
                    cv2.putText(
                        processed_frame,
                        f"Error: {str(e)[:30]}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2,
                    )

            # Convert to jpg for streaming
            ret, buffer = cv2.imencode(".jpg", processed_frame)
            if not ret:
                continue

            frame_bytes = buffer.tobytes()

            # If armed, send blank frames (just headers) to maintain connection
            # If disarmed, send actual video frames
            if is_armed:
                # Send minimal data to keep connection alive but save bandwidth
                yield (
                    b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + b"" + b"\r\n"
                )
                time.sleep(0.1)  # Slow down when armed
            else:
                # Send full frames when disarmed
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )

    # Return the generator function
    return generate_frames


# Create a single instance of the generator
stream_generator = get_global_stream_generator()


# Routes
@app.route("/video_feed")
def video_feed():
    """Route for streaming video feed - uses the single global generator"""
    return Response(
        stream_generator(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/status", methods=["GET"])
def status():
    """Get current system status without affecting camera"""
    global is_armed, camera, fall_detection_active
    return jsonify(
        {
            "armed": is_armed,
            "camera_active": (
                camera is not None and camera.isOpened() if camera else False
            ),
            "fall_detection_active": fall_detection_active,
        }
    )


@app.route("/mode", methods=["POST"])
def set_mode():
    """Set armed/disarmed mode without affecting camera operation"""
    global is_armed

    data = request.json
    if "armed" in data:
        is_armed = data["armed"]
        print(f"System mode changed to: {'ARMED' if is_armed else 'DISARMED'}")

    return jsonify({"status": "success", "armed": is_armed})


@app.route("/ping")
def ping():
    """Simple endpoint to check if server is alive"""
    return jsonify({"status": "alive"})


@app.route("/falls")
def get_falls():
    """Get list of detected falls with timestamps"""
    global fall_detector

    if fall_detector and hasattr(fall_detector, "falls_detected"):
        falls = []
        for person_id, frame_numbers in fall_detector.falls_detected.items():
            for frame in frame_numbers:
                falls.append(
                    {
                        "person_id": person_id,
                        "frame": frame,
                        "time": time.strftime(
                            "%Y-%m-%d %H:%M:%S",
                            time.localtime(time.time() - (frame_count - frame) / 30),
                        ),
                    }
                )

        return jsonify({"status": "success", "falls": falls, "count": len(falls)})
    else:
        return jsonify(
            {
                "status": "error",
                "message": "Fall detector not initialized or no falls detected",
            }
        )


if __name__ == "__main__":
    try:
        # Run the Flask app
        print("Starting fall detection system...")
        print("Camera will automatically reconnect if disconnected")
        print("Fall detection is active in both armed and disarmed states")
        app.run(debug=False, threaded=True, host="0.0.0.0")
    except KeyboardInterrupt:
        print("Server shutting down...")
    finally:
        # Clean up resources
        if camera is not None:
            camera.release()
        print("Camera released")
