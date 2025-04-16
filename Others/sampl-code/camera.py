import cv2
import subprocess
import platform
import time

def get_system_camera_info():
    """Attempt to get camera information from the system using platform-specific commands"""
    system = platform.system()
    print(f"Operating System: {system}")
    
    if system == "Windows":
        try:
            print("\nRunning system camera detection...")
            result = subprocess.run(["powershell", "-Command", "Get-PnpDevice -Class Camera"], 
                                   capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout)
            else:
                print("Failed to get system camera information")
        except Exception as e:
            print(f"Error running system command: {str(e)}")
    elif system == "Linux":
        try:
            print("\nRunning system camera detection...")
            result = subprocess.run(["v4l2-ctl", "--list-devices"], 
                                   capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout)
            else:
                print("Failed to get system camera information. Make sure v4l-utils is installed.")
        except Exception as e:
            print(f"Error running system command: {str(e)}")
    elif system == "Darwin":  # macOS
        try:
            print("\nRunning system camera detection...")
            result = subprocess.run(["system_profiler", "SPCameraDataType"], 
                                   capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout)
            else:
                print("Failed to get system camera information")
        except Exception as e:
            print(f"Error running system command: {str(e)}")

def try_camera_with_backends():
    """Try different OpenCV backends for camera detection"""
    print("\nTrying different camera backends...")
    backends = [cv2.CAP_ANY, cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_V4L2, cv2.CAP_AVFOUNDATION]
    backend_names = {
        cv2.CAP_ANY: "AUTO",
        cv2.CAP_DSHOW: "DirectShow (Windows)",
        cv2.CAP_MSMF: "Media Foundation (Windows)",
        cv2.CAP_V4L2: "Video4Linux2 (Linux)",
        cv2.CAP_AVFOUNDATION: "AVFoundation (macOS)"
    }
    
    for backend in backends:
        if backend not in backend_names:
            continue
            
        print(f"\nTrying {backend_names[backend]} backend...")
        
        for i in range(5):  # Try first 5 indices
            try:
                cap = cv2.VideoCapture(i, backend)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        print(f"✅ Camera {i} detected with {backend_names[backend]}")
                        print(f"   Resolution: {width}x{height}")
                        
                        # Show preview
                        window_name = f"Camera {i} - {backend_names[backend]}"
                        cv2.imshow(window_name, frame)
                        print(f"   Preview window opened. Press any key to continue...")
                        cv2.waitKey(0)
                        cv2.destroyWindow(window_name)
                    else:
                        print(f"❌ Camera {i} opened but couldn't read frame with {backend_names[backend]}")
                else:
                    print(f"❌ Camera {i} failed to open with {backend_names[backend]}")
                cap.release()
            except Exception as e:
                print(f"❌ Error with camera {i} using {backend_names[backend]}: {str(e)}")

def check_camera_with_path():
    """Try to connect using device path"""
    system = platform.system()
    
    if system == "Windows":
        print("\nTrying to connect to Logitech camera with direct path...")
        # Common Logitech camera paths
        paths = [
            "video=Logitech HD Webcam C270",
            "video=Logitech Webcam C920",
            "video=Logitech HD Pro Webcam C920",
            "video=Logitech HD Webcam"
        ]
        
        for path in paths:
            try:
                print(f"Trying path: {path}")
                cap = cv2.VideoCapture(path, cv2.CAP_DSHOW)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        print(f"✅ Success connecting with path: {path}")
                        cv2.imshow("Logitech Camera", frame)
                        cv2.waitKey(2000)
                        cv2.destroyAllWindows()
                    else:
                        print(f"❌ Connected but couldn't read frame from: {path}")
                else:
                    print(f"❌ Failed to connect with path: {path}")
                cap.release()
            except Exception as e:
                print(f"❌ Error with path {path}: {str(e)}")
    elif system == "Linux":
        print("\nTrying to connect to Logitech camera with direct path...")
        paths = ["/dev/video0", "/dev/video1", "/dev/video2"]
        for path in paths:
            try:
                print(f"Trying path: {path}")
                cap = cv2.VideoCapture(path)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        print(f"✅ Success connecting with path: {path}")
                        cv2.imshow("Logitech Camera", frame)
                        cv2.waitKey(2000)
                        cv2.destroyAllWindows()
                    else:
                        print(f"❌ Connected but couldn't read frame from: {path}")
                else:
                    print(f"❌ Failed to connect with path: {path}")
                cap.release()
            except Exception as e:
                print(f"❌ Error with path {path}: {str(e)}")

def main():
    print("=" * 50)
    print("Advanced Camera Detection Tool for Logitech Webcams")
    print("=" * 50)
    
    # Get system information about cameras
    get_system_camera_info()
    
    # Check cameras with different backends
    try_camera_with_backends()
    
    # Try direct paths
    check_camera_with_path()
    
    print("\n" + "=" * 50)
    print("Troubleshooting tips:")
    print("1. Make sure the camera is properly connected")
    print("2. Check if the camera is being used by another application")
    print("3. Try installing/updating Logitech drivers from their website")
    print("4. For Windows, try the DirectShow backend in your code:")
    print("   cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)")
    print("=" * 50)

if __name__ == "__main__":
    main()