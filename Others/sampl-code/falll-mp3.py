# fall_detector.py - Enhanced Fall Detection System for Elderly (60-80 years)
import cv2
import mediapipe as mp
import numpy as np
import os
import time
from datetime import datetime
import threading
import pytz
import pygame  # For playing audio
import speech_recognition as sr  # For voice recognition


# The PersonTracker class for tracking multiple individuals
class PersonTracker:
    """Track individual persons in the scene with unique IDs"""

    def __init__(self):
        self.next_id = 0
        self.tracked_persons = {}  # id -> keypoints, last_seen
        self.max_disappeared = 15  # Frames before removing a person
        self.iou_threshold = 0.25  # Lower threshold for better tracking of elderly
        self.velocity_history = (
            {}
        )  # Track person velocities for prediction during occlusion

    def get_person_bbox(self, keypoints):
        """Get bounding box for a person from keypoints"""
        x_points = [
            p[0] for p in keypoints.values() if isinstance(p, list) and len(p) == 2
        ]
        y_points = [
            p[1] for p in keypoints.values() if isinstance(p, list) and len(p) == 2
        ]

        if not x_points or not y_points:
            return None

        min_x, max_x = min(x_points), max(x_points)
        min_y, max_y = min(y_points), max(y_points)

        return [min_x, min_y, max_x, max_y]

    def calculate_iou(self, box1, box2):
        """Calculate IoU between two bounding boxes"""
        x1_min, y1_min, x1_max, y1_max = box1
        x2_min, y2_min, x2_max, y2_max = box2

        # Intersection area
        x_left = max(x1_min, x2_min)
        y_top = max(y1_min, y2_min)
        x_right = min(x1_max, x2_max)
        y_bottom = min(y1_max, y2_max)

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Union area
        box1_area = (x1_max - x1_min) * (y1_max - y1_min)
        box2_area = (x2_max - x2_min) * (y2_max - y2_min)
        union_area = box1_area + box2_area - intersection_area

        return intersection_area / union_area if union_area > 0 else 0

    def update(self, detected_persons_keypoints):
        """Update tracked persons with new detections - optimized for elderly tracking"""
        # If no tracked persons yet, assign IDs to all
        if not self.tracked_persons:
            for keypoints in detected_persons_keypoints:
                self.tracked_persons[self.next_id] = {
                    "keypoints": keypoints,
                    "last_seen": 0,
                    "bbox": self.get_person_bbox(keypoints),
                    "consistent_count": 1,  # Track consistency for stability
                }
                self.next_id += 1
            return {
                person_id: info["keypoints"]
                for person_id, info in self.tracked_persons.items()
            }

        # Calculate IoU between current detections and tracked persons
        matches = []
        unmatched_detections = list(range(len(detected_persons_keypoints)))
        unmatched_trackers = list(self.tracked_persons.keys())

        # Calculate IoU between all detection-tracker pairs
        for d_idx, detection_keypoints in enumerate(detected_persons_keypoints):
            d_bbox = self.get_person_bbox(detection_keypoints)
            if not d_bbox:
                continue

            for t_id in self.tracked_persons.keys():
                t_bbox = self.tracked_persons[t_id]["bbox"]
                if not t_bbox:
                    continue

                iou = self.calculate_iou(d_bbox, t_bbox)
                if iou > self.iou_threshold:
                    matches.append((d_idx, t_id, iou))

        # Sort matches by IoU (descending)
        matches.sort(key=lambda x: x[2], reverse=True)
        matched_detections = set()
        matched_trackers = set()

        # Associate detections with trackers
        for d_idx, t_id, iou in matches:
            if d_idx not in matched_detections and t_id not in matched_trackers:
                self.tracked_persons[t_id]["keypoints"] = detected_persons_keypoints[
                    d_idx
                ]
                self.tracked_persons[t_id]["last_seen"] = 0
                self.tracked_persons[t_id]["bbox"] = self.get_person_bbox(
                    detected_persons_keypoints[d_idx]
                )
                # Increase consistency count for better stability
                self.tracked_persons[t_id]["consistent_count"] = min(
                    self.tracked_persons[t_id].get("consistent_count", 0) + 1, 30
                )
                matched_detections.add(d_idx)
                matched_trackers.add(t_id)

        # Handle unmatched detections (new people)
        for d_idx in range(len(detected_persons_keypoints)):
            if d_idx not in matched_detections:
                self.tracked_persons[self.next_id] = {
                    "keypoints": detected_persons_keypoints[d_idx],
                    "last_seen": 0,
                    "bbox": self.get_person_bbox(detected_persons_keypoints[d_idx]),
                    "consistent_count": 1,
                }
                self.next_id += 1

        # Update disappeared counters and remove if necessary
        for t_id in list(self.tracked_persons.keys()):
            if t_id not in matched_trackers:
                self.tracked_persons[t_id]["last_seen"] += 1

                # More stable tracking for persons that have been consistently detected
                # Elderly may move slower, so we give more frames before removing
                adjusted_max_disappeared = min(
                    self.max_disappeared
                    + (self.tracked_persons[t_id].get("consistent_count", 0) // 2),
                    25,  # Maximum frames to keep tracking
                )

                if self.tracked_persons[t_id]["last_seen"] > adjusted_max_disappeared:
                    del self.tracked_persons[t_id]

        # Sort persons by consistency and limit to 3 for performance
        sorted_persons = sorted(
            self.tracked_persons.items(),
            key=lambda x: x[1].get("consistent_count", 0),
            reverse=True,
        )

        # Limit to top 3 persons with highest consistency
        top_persons = sorted_persons[:3]

        return {person_id: info["keypoints"] for person_id, info in top_persons}


# The FallDetector class definition
class FallDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        # Use higher confidence thresholds for more accurate tracking of elderly
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6,
            model_complexity=1,  # Medium complexity for balance of accuracy and speed
            smooth_landmarks=True,  # Enable landmark smoothing for stability
        )
        self.mp_drawing = mp.solutions.drawing_utils

        # Fall detection parameters optimized for elderly (60-80 years)
        self.height_ratio_threshold = (
            0.4  # Lower threshold for detecting lying position
        )
        self.velocity_threshold = 0.05  # Lower threshold for slower elderly movements
        self.stable_frames_threshold = 10  # Fewer frames for faster detection

        # Multi-person tracking and fall detection
        self.person_tracker = PersonTracker()
        self.person_fall_data = {}  # Person ID -> fall detection data
        self.max_persons = 3  # Maximum number of persons to track

        # Recording parameters
        self.is_recording = False
        self.record_start_time = None
        self.record_duration = 180  # 3 minutes in seconds after fall
        self.output_video = None
        self.output_path = None
        self.recording_thread = None
        self.recording_lock = threading.Lock()
        self.stop_recording = False
        self.recording_fps = 30
        self.recording_resolution = None
        self.always_show_skeleton = (
            True  # Always show skeleton for better visualization
        )

        # Results tracking
        self.falls_detected = (
            {}
        )  # Person ID -> list of frame numbers where falls detected

        # Audio response parameters
        self.audio_response_active = False
        self.audio_response_thread = None
        self.check_recovery_thread = None
        self.audio_stop_flag = False

        # Initialize pygame for audio
        pygame.mixer.init()

        # Audio file paths
        self.are_you_ok_audio = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Are-u-ok.mp3"
        self.emergency_audio = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Emergency.mp3"

    def reset(self):
        """Reset all tracking variables for a new video"""
        self.person_fall_data = {}
        self.falls_detected = {}
        self.is_recording = False
        self.record_start_time = None
        if self.output_video:
            self.output_video.release()
            self.output_video = None
        self.stop_recording = False

        # Reset audio response
        self.audio_response_active = False
        self.audio_stop_flag = True
        if self.audio_response_thread and self.audio_response_thread.is_alive():
            self.audio_response_thread.join(timeout=1)
        if self.check_recovery_thread and self.check_recovery_thread.is_alive():
            self.check_recovery_thread.join(timeout=1)
        self.audio_stop_flag = False

    def _get_person_fall_data(self, person_id):
        """Get or initialize fall detection data for a person"""
        if person_id not in self.person_fall_data:
            self.person_fall_data[person_id] = {
                "height_history": [],
                "time_history": [],
                "mid_hip_history": [],
                "mid_shoulder_history": [],
                "nose_history": [],
                "fall_counter": 0,
                "stable_counter": 0,
                "fall_detected": False,
                "recovery_counter": 0,
                "context_history": [],
                "last_detected_state": "unknown",
                "movement_after_fall": False,
                "last_position": None,
                "fall_time": None,
            }
        return self.person_fall_data[person_id]

    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)  # First point
        b = np.array(b)  # Midpoint
        c = np.array(c)  # Last point

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

        return np.degrees(angle)

    def calculate_distance(self, point1, point2):
        """Calculate Euclidean distance between two points"""
        return np.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)

    def get_body_keypoints(self, landmarks):
        """Extract relevant body keypoints"""
        keypoints = {}

        # Extract all relevant keypoints
        keypoints["nose"] = [
            landmarks[self.mp_pose.PoseLandmark.NOSE].x,
            landmarks[self.mp_pose.PoseLandmark.NOSE].y,
        ]
        keypoints["left_eye"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_EYE].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_EYE].y,
        ]
        keypoints["right_eye"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_EYE].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_EYE].y,
        ]
        keypoints["left_shoulder"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y,
        ]
        keypoints["right_shoulder"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].y,
        ]
        keypoints["left_hip"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y,
        ]
        keypoints["right_hip"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y,
        ]
        keypoints["left_knee"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y,
        ]
        keypoints["right_knee"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].y,
        ]
        keypoints["left_ankle"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y,
        ]
        keypoints["right_ankle"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y,
        ]
        keypoints["left_wrist"] = [
            landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].x,
            landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].y,
        ]
        keypoints["right_wrist"] = [
            landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].x,
            landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].y,
        ]

        # Calculate midpoints
        keypoints["mid_shoulder"] = [
            (keypoints["left_shoulder"][0] + keypoints["right_shoulder"][0]) / 2,
            (keypoints["left_shoulder"][1] + keypoints["right_shoulder"][1]) / 2,
        ]
        keypoints["mid_hip"] = [
            (keypoints["left_hip"][0] + keypoints["right_hip"][0]) / 2,
            (keypoints["left_hip"][1] + keypoints["right_hip"][1]) / 2,
        ]

        return keypoints

    def detect_abnormal_posture(self, keypoints, person_data):
        """Detect abnormal body posture based on angles and positions - optimized for elderly"""
        try:
            # Calculate key angles with proper error handling
            spine_angle = self.calculate_angle(
                keypoints["mid_shoulder"],
                keypoints["mid_hip"],
                [keypoints["mid_hip"][0], keypoints["mid_hip"][1] + 0.1],
            )
        except:
            spine_angle = 180  # Default to upright if calculation fails

        try:
            left_leg_angle = self.calculate_angle(
                keypoints["left_hip"], keypoints["left_knee"], keypoints["left_ankle"]
            )
        except:
            left_leg_angle = 180  # Default to straight if calculation fails

        try:
            right_leg_angle = self.calculate_angle(
                keypoints["right_hip"],
                keypoints["right_knee"],
                keypoints["right_ankle"],
            )
        except:
            right_leg_angle = 180  # Default to straight if calculation fails

        # Check horizontal alignment (lying down) - more lenient for elderly
        is_horizontal = abs(90 - spine_angle) < 30  # For elderly, use wider threshold

        # Calculate hip height relative to frame height
        hip_height_ratio = keypoints["mid_hip"][1]  # Y-coordinate (0-1)

        # Check bent legs (fall position) - common in elderly falls
        left_leg_bent = left_leg_angle < 130  # More lenient for elderly
        right_leg_bent = right_leg_angle < 130  # More lenient for elderly
        legs_bent = (
            left_leg_bent or right_leg_bent
        )  # Only one bent leg needed for elderly

        # Check if shoulders are near hip level (collapsed posture)
        shoulder_hip_alignment = (
            abs(keypoints["mid_shoulder"][1] - keypoints["mid_hip"][1]) < 0.2
        )

        # Check if person is on floor - more sensitive threshold for elderly
        is_on_floor = hip_height_ratio > 0.65  # Higher in frame = closer to floor

        # Detect floor sitting to avoid false positives
        is_floor_sitting = self._detect_floor_sitting_improved(keypoints)

        # Calculate confidence score for abnormal posture (0.0-1.0)
        confidence_factors = [
            is_horizontal * 1.0,  # Strong indicator
            (legs_bent and is_on_floor) * 0.8,  # Good indicator
            (shoulder_hip_alignment and is_on_floor) * 0.7,  # Moderate indicator
        ]

        # Sum the confidence factors, clip to 0-1 range
        confidence = min(1.0, sum(confidence_factors))

        # Store confidence for trend analysis
        if "posture_confidence" not in person_data:
            person_data["posture_confidence"] = []

        person_data["posture_confidence"].append(confidence)
        if len(person_data["posture_confidence"]) > 10:
            person_data["posture_confidence"].pop(0)

        # Check if confidence is high enough and not likely floor sitting
        # Use lower threshold for elderly to detect falls faster
        return confidence > 0.5 and not is_floor_sitting

    def detect_lying_position(self, keypoints, person_data):
        """Detect if the person is in a lying position - calibrated for elderly falls"""
        try:
            # Calculate head to feet vertical ratio
            head_y = keypoints["nose"][1]
            feet_y = max(keypoints["left_ankle"][1], keypoints["right_ankle"][1])
            body_height_ratio = feet_y - head_y

            # Calculate horizontal spread (width) of the body
            leftmost_x = min(keypoints["left_shoulder"][0], keypoints["left_hip"][0])
            rightmost_x = max(keypoints["right_shoulder"][0], keypoints["right_hip"][0])
            body_width_ratio = rightmost_x - leftmost_x

            # For elderly lying down, the width/height ratio is a key indicator
            width_height_ratio = body_width_ratio / (
                body_height_ratio if body_height_ratio > 0.1 else 0.1
            )

            # Add height to history
            person_data["height_history"].append(body_height_ratio)
            if len(person_data["height_history"]) > 20:
                person_data["height_history"].pop(0)

            # Calculate spine angle (should be close to horizontal when lying)
            spine_angle = self.calculate_angle(
                keypoints["mid_shoulder"],
                keypoints["mid_hip"],
                [
                    keypoints["mid_hip"][0] + 0.1,
                    keypoints["mid_hip"][1],
                ],  # Horizontal reference
            )

            # Check if spine is more horizontal than vertical
            is_spine_horizontal = abs(90 - spine_angle) < 30  # More lenient for elderly

            # Calculate average height ratio over recent frames
            avg_height_ratio = sum(person_data["height_history"]) / max(
                len(person_data["height_history"]), 1
            )

            # Check if head is at similar height to hips (common in lying)
            head_hip_height_similar = (
                abs(keypoints["nose"][1] - keypoints["mid_hip"][1]) < 0.2
            )  # More lenient

            # Check for stable sitting position to avoid false positives
            is_floor_sitting = self._detect_floor_sitting_improved(keypoints)

            # Calculate confidence score for lying position
            lying_confidence = 0.0

            # Factors that indicate lying, with appropriate weights for elderly
            if is_spine_horizontal:
                lying_confidence += 0.4

            if avg_height_ratio < self.height_ratio_threshold:
                lying_confidence += 0.3

            if width_height_ratio > 1.5:  # More lenient for elderly
                lying_confidence += 0.2

            if head_hip_height_similar:
                lying_confidence += 0.1

            # Store confidence for trend analysis
            if "lying_confidence" not in person_data:
                person_data["lying_confidence"] = []

            person_data["lying_confidence"].append(lying_confidence)
            if len(person_data["lying_confidence"]) > 10:
                person_data["lying_confidence"].pop(0)

            # For elderly detection, use lower threshold to detect falls faster
            return lying_confidence > 0.5 and not is_floor_sitting

        except Exception as e:
            # If calculation fails, assume not lying
            return False

    def detect_sudden_movement(self, keypoints, person_data):
        """Detect sudden movement by tracking velocity - optimized for elderly movement patterns"""
        velocities = {}
        movement_detected = False

        # Update position history for key points
        current_time = time.time()
        for point in ["mid_hip", "mid_shoulder", "nose"]:
            if point in keypoints:
                if f"{point}_history" not in person_data:
                    person_data[f"{point}_history"] = []
                    person_data["time_history"] = []

                # Add current position to history
                person_data[f"{point}_history"].append(
                    (keypoints[point][0], keypoints[point][1])
                )
                person_data["time_history"].append(current_time)

                # Keep history limited to recent frames
                max_history = 10
                if len(person_data[f"{point}_history"]) > max_history:
                    person_data[f"{point}_history"].pop(0)
                    person_data["time_history"].pop(0)

                # Calculate velocity if we have enough history
                if len(person_data[f"{point}_history"]) >= 3:
                    # Get points for velocity calculation
                    start_point = person_data[f"{point}_history"][-3]
                    end_point = person_data[f"{point}_history"][-1]

                    # Time difference
                    time_diff = (
                        person_data["time_history"][-1]
                        - person_data["time_history"][-3]
                    )
                    if time_diff < 0.001:  # Avoid division by zero
                        time_diff = 0.001

                    # Horizontal and vertical displacements
                    dx = end_point[0] - start_point[0]
                    dy = end_point[1] - start_point[1]

                    # Calculate velocities (change per second)
                    vx = dx / time_diff
                    vy = dy / time_diff

                    # Total velocity (magnitude)
                    v_total = np.sqrt(vx**2 + vy**2)

                    # Store velocities
                    velocities[point] = {
                        "vx": vx,
                        "vy": vy,
                        "v_total": v_total,
                        "vertical_dominant": abs(vy) > abs(vx),
                    }

        # For elderly falls, we care most about:
        # 1. Vertical velocity (vy) of mid_hip and mid_shoulder (downward movement)
        # 2. Overall movement consistency (similar direction for multiple points)
        # 3. Acceleration trends (increasing velocity)

        movement_confidence = 0.0

        # Check if we have enough velocity data
        if len(velocities) >= 2:
            # Calculate movement confidence based on key indicators

            # 1. Check for significant vertical movement (especially downward)
            if "mid_hip" in velocities:
                hip_vy = velocities["mid_hip"]["vy"]
                # Positive vy means downward movement in image coordinates
                if hip_vy > 0 and hip_vy > self.velocity_threshold:
                    movement_confidence += min(
                        0.5, hip_vy / (self.velocity_threshold * 5)
                    )

            # 2. Check for consistent movement direction across keypoints
            directions_consistent = True
            reference_direction = None

            for point, v_data in velocities.items():
                if v_data["v_total"] > self.velocity_threshold * 0.5:
                    direction = np.arctan2(v_data["vy"], v_data["vx"])

                    if reference_direction is None:
                        reference_direction = direction
                    elif (
                        abs(direction - reference_direction) > np.pi / 4
                    ):  # More than 45 degrees different
                        directions_consistent = False

            if directions_consistent and reference_direction is not None:
                movement_confidence += 0.2

            # 3. Check if movement is primarily vertical (typical for falls)
            vertical_dominant_count = sum(
                1 for v_data in velocities.values() if v_data["vertical_dominant"]
            )
            if vertical_dominant_count >= 2:
                movement_confidence += 0.2

            # 4. Check for acceleration (increasing velocity) - important for falls
            if "mid_hip" in velocities and len(person_data["mid_hip_history"]) >= 5:
                # Calculate velocities at two points in time
                recent_positions = person_data["mid_hip_history"]

                # Earlier velocity (3-5 frames ago)
                early_dx = recent_positions[-3][0] - recent_positions[-5][0]
                early_dy = recent_positions[-3][1] - recent_positions[-5][1]
                early_time_diff = (
                    person_data["time_history"][-3] - person_data["time_history"][-5]
                )
                early_v = np.sqrt(early_dx**2 + early_dy**2) / (
                    early_time_diff if early_time_diff > 0.1 else 0.1
                )

                # Recent velocity (0-2 frames ago)
                recent_dx = recent_positions[-1][0] - recent_positions[-3][0]
                recent_dy = recent_positions[-1][1] - recent_positions[-3][1]
                recent_time_diff = (
                    person_data["time_history"][-1] - person_data["time_history"][-3]
                )
                recent_v = np.sqrt(recent_dx**2 + recent_dy**2) / (
                    recent_time_diff if recent_time_diff > 0.1 else 0.1
                )

                # Check for acceleration
                acceleration = recent_v - early_v
                if acceleration > self.velocity_threshold:
                    movement_confidence += 0.2

            # Store movement confidence for trend analysis
            if "movement_confidence" not in person_data:
                person_data["movement_confidence"] = []

            person_data["movement_confidence"].append(movement_confidence)
            if len(person_data["movement_confidence"]) > 10:
                person_data["movement_confidence"].pop(0)

            # Determine if sudden movement is detected based on confidence
            # Lower threshold for elderly to detect falls faster
            movement_detected = movement_confidence > 0.4

        return movement_detected

    def check_all_fall_conditions(
        self, abnormal_posture, lying_position, sudden_movement, person_data
    ):
        """Enhanced fall detection by checking multiple conditions together"""
        # Store individual detection results for display and analysis
        if "detection_results" not in person_data:
            person_data["detection_results"] = []

        # Create a record of the current detection state
        current_detection = {
            "abnormal_posture": abnormal_posture,
            "lying_position": lying_position,
            "sudden_movement": sudden_movement,
            "timestamp": time.time(),
        }

        # Add to history and keep limited size
        person_data["detection_results"].append(current_detection)
        if len(person_data["detection_results"]) > 30:  # Keep about 1 second of history
            person_data["detection_results"].pop(0)

        # Check for unstable state (when person is not in a stable position)
        # This helps distinguish intentional floor positions from falls
        unstable = False

        # Calculate stability confidence based on position variance over time
        if len(person_data["detection_results"]) >= 5:
            # Check if there was a recent transition from normal posture to abnormal
            recent_results = person_data["detection_results"][-5:]
            posture_transitions = sum(
                1
                for i in range(1, len(recent_results))
                if recent_results[i]["abnormal_posture"]
                != recent_results[i - 1]["abnormal_posture"]
            )

            # Check if there was a recent transition from not-lying to lying
            lying_transitions = sum(
                1
                for i in range(1, len(recent_results))
                if recent_results[i]["lying_position"]
                != recent_results[i - 1]["lying_position"]
            )

            # If there were multiple transitions, consider it unstable
            unstable = posture_transitions >= 1 or lying_transitions >= 1

            # Only consider unstable if there was also recent movement
            unstable = unstable and any(
                r["sudden_movement"] for r in recent_results[-3:]
            )

        # Update the current detection record with stability information
        current_detection["unstable"] = unstable

        # Add a combined score based on all factors
        # This creates a more nuanced fall detection that requires multiple conditions
        combined_fall_score = 0

        # Base scores from individual detectors - weighted for elderly fall patterns
        if abnormal_posture:
            combined_fall_score += 2

        if lying_position:
            combined_fall_score += 3  # Lying position is a strong indicator for elderly

        if sudden_movement:
            combined_fall_score += 1

        if unstable:
            combined_fall_score += 2

        # If we have observed a sequence of conditions typical for a fall
        # For example: sudden movement followed by abnormal posture and lying position
        fall_sequence_detected = False
        if len(person_data["detection_results"]) >= 10:
            # Check if within last 10 frames we had:
            # 1. Sudden movement followed by
            # 2. Abnormal posture and
            # 3. Lying position
            recent_results = person_data["detection_results"][-10:]

            had_movement = any(r["sudden_movement"] for r in recent_results[:5])
            had_abnormal = any(r["abnormal_posture"] for r in recent_results[3:])
            had_lying = any(r["lying_position"] for r in recent_results[5:])

            fall_sequence_detected = had_movement and had_abnormal and had_lying

            if fall_sequence_detected:
                combined_fall_score += 3

        # For display purposes in the debug overlay
        current_detection["combined_score"] = combined_fall_score
        person_data["current_detection"] = current_detection

        # This is the multi-condition check for elderly fall detection
        # Only detect a fall if enough conditions are met
        all_conditions_met = (
            abnormal_posture and lying_position and (sudden_movement or unstable)
        )

        # Or if we have a high combined score from multiple partial detections
        # Lower threshold for elderly to detect falls faster (6 instead of 7)
        high_confidence = combined_fall_score >= 6

        # The final fall detection result combines both approaches
        return all_conditions_met or high_confidence, current_detection
