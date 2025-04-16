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
from twilio.rest import Client  # For SMS notifications

# Twilio credentials (make sure to keep these secure in production)
TWILIO_ACCOUNT_SID = "AC084d5387ee90e933a1ff023337cac58e"
TWILIO_AUTH_TOKEN = (
    "ebd99c6e9c2eef99880fd72d10439098"  # Replace with actual auth token in production
)
TWILIO_PHONE_NUMBER = "+12186566943"
EMERGENCY_CONTACT = "+919080557940"  # Replace with actual emergency contact number


def send_emergency_sms():
    """Send emergency SMS using Twilio - Direct implementation"""
    try:
        # Create a fresh Twilio client instance each time
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body="🚨 Alert: A fall has been detected. Please check in immediately.",
            from_=TWILIO_PHONE_NUMBER,
            to=EMERGENCY_CONTACT,
        )
        print("✅ Emergency SMS sent successfully! SID:", message.sid)
        return True
    except Exception as e:
        print(f"❌ Failed to send emergency SMS: {e}")
        return False


# The PersonTracker class for tracking multiple individuals
class PersonTracker:
    def __init__(self):
        self.next_id = 0
        self.tracked_persons = {}
        self.max_disappeared = 15
        self.iou_threshold = 0.25
        self.velocity_history = {}

    def get_person_bbox(self, keypoints):
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
        x1_min, y1_min, x1_max, y1_max = box1
        x2_min, y2_min, x2_max, y2_max = box2
        x_left = max(x1_min, x2_min)
        y_top = max(y1_min, y2_min)
        x_right = min(x1_max, x2_max)
        y_bottom = min(y1_max, y2_max)
        if x_right < x_left or y_bottom < y_top:
            return 0.0
        intersection_area = (x_right - x_left) * (y_bottom - y_top)
        box1_area = (x1_max - x1_min) * (y1_max - y1_min)
        box2_area = (x2_max - x2_min) * (y2_max - y2_min)
        union_area = box1_area + box2_area - intersection_area
        return intersection_area / union_area if union_area > 0 else 0

    def update(self, detected_persons_keypoints):
        if not self.tracked_persons:
            for keypoints in detected_persons_keypoints:
                self.tracked_persons[self.next_id] = {
                    "keypoints": keypoints,
                    "last_seen": 0,
                    "bbox": self.get_person_bbox(keypoints),
                    "consistent_count": 1,
                }
                self.next_id += 1
            return {
                person_id: info["keypoints"]
                for person_id, info in self.tracked_persons.items()
            }

        matches = []
        unmatched_detections = list(range(len(detected_persons_keypoints)))
        unmatched_trackers = list(self.tracked_persons.keys())

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

        matches.sort(key=lambda x: x[2], reverse=True)
        matched_detections = set()
        matched_trackers = set()

        for d_idx, t_id, iou in matches:
            if d_idx not in matched_detections and t_id not in matched_trackers:
                self.tracked_persons[t_id]["keypoints"] = detected_persons_keypoints[
                    d_idx
                ]
                self.tracked_persons[t_id]["last_seen"] = 0
                self.tracked_persons[t_id]["bbox"] = self.get_person_bbox(
                    detected_persons_keypoints[d_idx]
                )
                self.tracked_persons[t_id]["consistent_count"] = min(
                    self.tracked_persons[t_id].get("consistent_count", 0) + 1, 30
                )
                matched_detections.add(d_idx)
                matched_trackers.add(t_id)

        for d_idx in range(len(detected_persons_keypoints)):
            if d_idx not in matched_detections:
                self.tracked_persons[self.next_id] = {
                    "keypoints": detected_persons_keypoints[d_idx],
                    "last_seen": 0,
                    "bbox": self.get_person_bbox(detected_persons_keypoints[d_idx]),
                    "consistent_count": 1,
                }
                self.next_id += 1

        for t_id in list(self.tracked_persons.keys()):
            if t_id not in matched_trackers:
                self.tracked_persons[t_id]["last_seen"] += 1
                adjusted_max_disappeared = min(
                    self.max_disappeared
                    + (self.tracked_persons[t_id].get("consistent_count", 0) // 2),
                    25,
                )
                if self.tracked_persons[t_id]["last_seen"] > adjusted_max_disappeared:
                    del self.tracked_persons[t_id]

        sorted_persons = sorted(
            self.tracked_persons.items(),
            key=lambda x: x[1].get("consistent_count", 0),
            reverse=True,
        )
        top_persons = sorted_persons[:3]
        return {person_id: info["keypoints"] for person_id, info in top_persons}


class FallDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6,
            model_complexity=1,
            smooth_landmarks=True,
        )
        self.mp_drawing = mp.solutions.drawing_utils

        self.height_ratio_threshold = 0.4
        self.velocity_threshold = 0.05
        self.stable_frames_threshold = 10

        self.person_tracker = PersonTracker()
        self.person_fall_data = {}
        self.max_persons = 3

        self.is_recording = False
        self.record_start_time = None
        self.record_duration = 180
        self.output_video = None
        self.output_path = None
        self.recording_thread = None
        self.recording_lock = threading.Lock()
        self.stop_recording = False
        self.recording_fps = 30
        self.recording_resolution = None
        self.always_show_skeleton = True

        self.falls_detected = {}
        self.audio_response_active = False
        self.audio_response_thread = None
        self.audio_stop_flag = False

        pygame.mixer.init()
        self.are_you_ok_audio = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Are-u-ok.mp3"
        self.emergency_audio = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Emergency.mp3"

        # SMS cooldown tracking
        self.last_sms_time = 0
        self.sms_cooldown = 300  # 5 minutes cooldown between SMS

    def reset(self):
        self.person_fall_data = {}
        self.falls_detected = {}
        self.is_recording = False
        self.record_start_time = None
        if self.output_video:
            self.output_video.release()
            self.output_video = None
        self.stop_recording = False
        self.audio_response_active = False
        self.audio_stop_flag = True
        if self.audio_response_thread and self.audio_response_thread.is_alive():
            self.audio_response_thread.join(timeout=1)
        self.audio_stop_flag = False
        self.last_sms_time = 0

    def _get_person_fall_data(self, person_id):
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
                "no_movement_start_time": None,
                "audio_triggered": False,
                "sms_sent": False,
            }
        return self.person_fall_data[person_id]

    def calculate_angle(self, a, b, c):
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        ba = a - b
        bc = c - b
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        return np.degrees(angle)

    def calculate_distance(self, point1, point2):
        return np.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)

    def get_body_keypoints(self, landmarks):
        keypoints = {
            "nose": [
                landmarks[self.mp_pose.PoseLandmark.NOSE].x,
                landmarks[self.mp_pose.PoseLandmark.NOSE].y,
            ],
            "left_eye": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_EYE].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_EYE].y,
            ],
            "right_eye": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_EYE].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_EYE].y,
            ],
            "left_shoulder": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y,
            ],
            "right_shoulder": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].y,
            ],
            "left_hip": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y,
            ],
            "right_hip": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y,
            ],
            "left_knee": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y,
            ],
            "right_knee": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].y,
            ],
            "left_ankle": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y,
            ],
            "right_ankle": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y,
            ],
            "left_wrist": [
                landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].x,
                landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].y,
            ],
            "right_wrist": [
                landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].x,
                landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].y,
            ],
        }
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
        try:
            spine_angle = self.calculate_angle(
                keypoints["mid_shoulder"],
                keypoints["mid_hip"],
                [keypoints["mid_hip"][0], keypoints["mid_hip"][1] + 0.1],
            )
        except:
            spine_angle = 180

        try:
            left_leg_angle = self.calculate_angle(
                keypoints["left_hip"], keypoints["left_knee"], keypoints["left_ankle"]
            )
        except:
            left_leg_angle = 180

        try:
            right_leg_angle = self.calculate_angle(
                keypoints["right_hip"],
                keypoints["right_knee"],
                keypoints["right_ankle"],
            )
        except:
            right_leg_angle = 180

        is_horizontal = abs(90 - spine_angle) < 30
        hip_height_ratio = keypoints["mid_hip"][1]
        left_leg_bent = left_leg_angle < 130
        right_leg_bent = right_leg_angle < 130
        legs_bent = left_leg_bent or right_leg_bent
        shoulder_hip_alignment = (
            abs(keypoints["mid_shoulder"][1] - keypoints["mid_hip"][1]) < 0.2
        )
        is_on_floor = hip_height_ratio > 0.65
        is_floor_sitting = self._detect_floor_sitting_improved(keypoints)

        confidence_factors = [
            is_horizontal * 1.0,
            (legs_bent and is_on_floor) * 0.8,
            (shoulder_hip_alignment and is_on_floor) * 0.7,
        ]
        confidence = min(1.0, sum(confidence_factors))

        if "posture_confidence" not in person_data:
            person_data["posture_confidence"] = []
        person_data["posture_confidence"].append(confidence)
        if len(person_data["posture_confidence"]) > 10:
            person_data["posture_confidence"].pop(0)

        return confidence > 0.5 and not is_floor_sitting

    def detect_lying_position(self, keypoints, person_data):
        try:
            head_y = keypoints["nose"][1]
            feet_y = max(keypoints["left_ankle"][1], keypoints["right_ankle"][1])
            body_height_ratio = feet_y - head_y
            leftmost_x = min(keypoints["left_shoulder"][0], keypoints["left_hip"][0])
            rightmost_x = max(keypoints["right_shoulder"][0], keypoints["right_hip"][0])
            body_width_ratio = rightmost_x - leftmost_x
            width_height_ratio = body_width_ratio / (
                body_height_ratio if body_height_ratio > 0.1 else 0.1
            )

            person_data["height_history"].append(body_height_ratio)
            if len(person_data["height_history"]) > 20:
                person_data["height_history"].pop(0)

            spine_angle = self.calculate_angle(
                keypoints["mid_shoulder"],
                keypoints["mid_hip"],
                [keypoints["mid_hip"][0] + 0.1, keypoints["mid_hip"][1]],
            )
            is_spine_horizontal = abs(90 - spine_angle) < 30
            avg_height_ratio = sum(person_data["height_history"]) / max(
                len(person_data["height_history"]), 1
            )
            head_hip_height_similar = (
                abs(keypoints["nose"][1] - keypoints["mid_hip"][1]) < 0.2
            )
            is_floor_sitting = self._detect_floor_sitting_improved(keypoints)

            lying_confidence = 0.0
            if is_spine_horizontal:
                lying_confidence += 0.4
            if avg_height_ratio < self.height_ratio_threshold:
                lying_confidence += 0.3
            if width_height_ratio > 1.5:
                lying_confidence += 0.2
            if head_hip_height_similar:
                lying_confidence += 0.1

            if "lying_confidence" not in person_data:
                person_data["lying_confidence"] = []
            person_data["lying_confidence"].append(lying_confidence)
            if len(person_data["lying_confidence"]) > 10:
                person_data["lying_confidence"].pop(0)

            return lying_confidence > 0.5 and not is_floor_sitting
        except Exception:
            return False

    def detect_sudden_movement(self, keypoints, person_data):
        velocities = {}
        current_time = time.time()
        for point in ["mid_hip", "mid_shoulder", "nose"]:
            if point in keypoints:
                if f"{point}_history" not in person_data:
                    person_data[f"{point}_history"] = []
                    person_data["time_history"] = []
                person_data[f"{point}_history"].append(
                    (keypoints[point][0], keypoints[point][1])
                )
                person_data["time_history"].append(current_time)
                max_history = 10
                if len(person_data[f"{point}_history"]) > max_history:
                    person_data[f"{point}_history"].pop(0)
                    person_data["time_history"].pop(0)
                if len(person_data[f"{point}_history"]) >= 3:
                    start_point = person_data[f"{point}_history"][-3]
                    end_point = person_data[f"{point}_history"][-1]
                    time_diff = (
                        person_data["time_history"][-1]
                        - person_data["time_history"][-3]
                    )
                    if time_diff < 0.001:
                        time_diff = 0.001
                    dx = end_point[0] - start_point[0]
                    dy = end_point[1] - start_point[1]
                    vx = dx / time_diff
                    vy = dy / time_diff
                    v_total = np.sqrt(vx**2 + vy**2)
                    velocities[point] = {
                        "vx": vx,
                        "vy": vy,
                        "v_total": v_total,
                        "vertical_dominant": abs(vy) > abs(vx),
                    }

        movement_confidence = 0.0
        if len(velocities) >= 2:
            if "mid_hip" in velocities:
                hip_vy = velocities["mid_hip"]["vy"]
                if hip_vy > 0 and hip_vy > self.velocity_threshold:
                    movement_confidence += min(
                        0.5, hip_vy / (self.velocity_threshold * 5)
                    )

            directions_consistent = True
            reference_direction = None
            for point, v_data in velocities.items():
                if v_data["v_total"] > self.velocity_threshold * 0.5:
                    direction = np.arctan2(v_data["vy"], v_data["vx"])
                    if reference_direction is None:
                        reference_direction = direction
                    elif abs(direction - reference_direction) > np.pi / 4:
                        directions_consistent = False
            if directions_consistent and reference_direction is not None:
                movement_confidence += 0.2

            vertical_dominant_count = sum(
                1 for v_data in velocities.values() if v_data["vertical_dominant"]
            )
            if vertical_dominant_count >= 2:
                movement_confidence += 0.2

            if "mid_hip" in velocities and len(person_data["mid_hip_history"]) >= 5:
                recent_positions = person_data["mid_hip_history"]
                early_dx = recent_positions[-3][0] - recent_positions[-5][0]
                early_dy = recent_positions[-3][1] - recent_positions[-5][1]
                early_time_diff = (
                    person_data["time_history"][-3] - person_data["time_history"][-5]
                )
                early_v = np.sqrt(early_dx**2 + early_dy**2) / (
                    early_time_diff if early_time_diff > 0.1 else 0.1
                )
                recent_dx = recent_positions[-1][0] - recent_positions[-3][0]
                recent_dy = recent_positions[-1][1] - recent_positions[-3][1]
                recent_time_diff = (
                    person_data["time_history"][-1] - person_data["time_history"][-3]
                )
                recent_v = np.sqrt(recent_dx**2 + recent_dy**2) / (
                    recent_time_diff if recent_time_diff > 0.1 else 0.1
                )
                acceleration = recent_v - early_v
                if acceleration > self.velocity_threshold:
                    movement_confidence += 0.2

            if "movement_confidence" not in person_data:
                person_data["movement_confidence"] = []
            person_data["movement_confidence"].append(movement_confidence)
            if len(person_data["movement_confidence"]) > 10:
                person_data["movement_confidence"].pop(0)

            return movement_confidence > 0.4
        return False

    def check_all_fall_conditions(
        self, abnormal_posture, lying_position, sudden_movement, person_data
    ):
        if "detection_results" not in person_data:
            person_data["detection_results"] = []
        current_detection = {
            "abnormal_posture": abnormal_posture,
            "lying_position": lying_position,
            "sudden_movement": sudden_movement,
            "timestamp": time.time(),
        }
        person_data["detection_results"].append(current_detection)
        if len(person_data["detection_results"]) > 30:
            person_data["detection_results"].pop(0)

        unstable = False
        if len(person_data["detection_results"]) >= 5:
            recent_results = person_data["detection_results"][-5:]
            posture_transitions = sum(
                1
                for i in range(1, len(recent_results))
                if recent_results[i]["abnormal_posture"]
                != recent_results[i - 1]["abnormal_posture"]
            )
            lying_transitions = sum(
                1
                for i in range(1, len(recent_results))
                if recent_results[i]["lying_position"]
                != recent_results[i - 1]["lying_position"]
            )
            unstable = (posture_transitions >= 1 or lying_transitions >= 1) and any(
                r["sudden_movement"] for r in recent_results[-3:]
            )

        current_detection["unstable"] = unstable
        combined_fall_score = 0
        if abnormal_posture:
            combined_fall_score += 2
        if lying_position:
            combined_fall_score += 3
        if sudden_movement:
            combined_fall_score += 1
        if unstable:
            combined_fall_score += 2

        fall_sequence_detected = False
        if len(person_data["detection_results"]) >= 10:
            recent_results = person_data["detection_results"][-10:]
            had_movement = any(r["sudden_movement"] for r in recent_results[:5])
            had_abnormal = any(r["abnormal_posture"] for r in recent_results[3:])
            had_lying = any(r["lying_position"] for r in recent_results[5:])
            fall_sequence_detected = had_movement and had_abnormal and had_lying
            if fall_sequence_detected:
                combined_fall_score += 3

        current_detection["combined_score"] = combined_fall_score
        person_data["current_detection"] = current_detection
        all_conditions_met = (
            abnormal_posture and lying_position and (sudden_movement or unstable)
        )
        high_confidence = combined_fall_score >= 6
        return all_conditions_met or high_confidence, current_detection

    def _detect_floor_sitting_improved(self, keypoints):
        try:
            spine_angle = self.calculate_angle(
                keypoints["mid_shoulder"],
                keypoints["mid_hip"],
                [keypoints["mid_hip"][0], keypoints["mid_hip"][1] + 0.1],
            )
        except:
            spine_angle = 180

        try:
            knee_distance = self.calculate_distance(
                keypoints["left_knee"], keypoints["right_knee"]
            )
            hip_distance = self.calculate_distance(
                keypoints["left_hip"], keypoints["right_hip"]
            )
            knee_hip_ratio = knee_distance / hip_distance if hip_distance > 0 else 0
            knees_wide = knee_hip_ratio > 1.2
            ankles_near = (
                self.calculate_distance(keypoints["left_ankle"], keypoints["mid_hip"])
                < 1.2
                * self.calculate_distance(keypoints["left_knee"], keypoints["mid_hip"])
            ) or (
                self.calculate_distance(keypoints["right_ankle"], keypoints["mid_hip"])
                < 1.2
                * self.calculate_distance(keypoints["right_knee"], keypoints["mid_hip"])
            )
            cross_legged = knees_wide and ankles_near
        except:
            cross_legged = False

        try:
            hips_low = keypoints["mid_hip"][1] > 0.65
            upper_body_upright = spine_angle > 150
            left_knee_angle = self.calculate_angle(
                keypoints["left_hip"], keypoints["left_knee"], keypoints["left_ankle"]
            )
            right_knee_angle = self.calculate_angle(
                keypoints["right_hip"],
                keypoints["right_knee"],
                keypoints["right_ankle"],
            )
            knees_bent = left_knee_angle < 140 and right_knee_angle < 140
            sitting_on_floor = hips_low and upper_body_upright and knees_bent
        except:
            sitting_on_floor = False

        confidence_factors = [cross_legged * 0.8, sitting_on_floor * 0.7]
        sitting_confidence = min(1.0, sum(confidence_factors))
        return sitting_confidence > 0.6

    def _draw_skeleton(self, image_out, keypoints, person_data):
        h, w = image_out.shape[:2]
        connections = [
            ("left_shoulder", "right_shoulder"),
            ("left_shoulder", "left_hip"),
            ("right_shoulder", "right_hip"),
            ("left_hip", "right_hip"),
            ("left_hip", "left_knee"),
            ("left_knee", "left_ankle"),
            ("right_hip", "right_knee"),
            ("right_knee", "right_ankle"),
        ]
        for start_point, end_point in connections:
            if start_point in keypoints and end_point in keypoints:
                cv2.line(
                    image_out,
                    (
                        int(keypoints[start_point][0] * w),
                        int(keypoints[start_point][1] * h),
                    ),
                    (
                        int(keypoints[end_point][0] * w),
                        int(keypoints[end_point][1] * h),
                    ),
                    (0, 255, 0),
                    3,
                )
        for key in [
            "nose",
            "mid_shoulder",
            "mid_hip",
            "left_knee",
            "right_knee",
            "left_ankle",
            "right_ankle",
        ]:
            if key in keypoints:
                cv2.circle(
                    image_out,
                    (int(keypoints[key][0] * w), int(keypoints[key][1] * h)),
                    6,
                    (0, 0, 255),
                    -1,
                )

        if person_data.get("fall_detected", False):
            text_position = (
                int(keypoints["mid_shoulder"][0] * w) - 70,
                int(keypoints["mid_shoulder"][1] * h) - 30,
            )
            cv2.putText(
                image_out,
                "FALL DETECTED!",
                text_position,
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (255, 255, 255),
                4,
            )
            cv2.putText(
                image_out,
                "FALL DETECTED!",
                text_position,
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (0, 0, 255),
                2,
            )

        if "current_detection" in person_data:
            detection = person_data["current_detection"]
            status_x, status_y, line_height = 10, 150, 30
            cv2.putText(
                image_out,
                f"Abnormal Posture: {detection['abnormal_posture']}",
                (status_x, status_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0) if not detection["abnormal_posture"] else (0, 0, 255),
                2,
            )
            cv2.putText(
                image_out,
                f"Lying Position: {detection['lying_position']}",
                (status_x, status_y + line_height),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0) if not detection["lying_position"] else (0, 0, 255),
                2,
            )
            cv2.putText(
                image_out,
                f"Sudden Movement: {detection['sudden_movement']}",
                (status_x, status_y + 2 * line_height),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0) if not detection["sudden_movement"] else (0, 0, 255),
                2,
            )
            cv2.putText(
                image_out,
                f"Unstable: {detection['unstable']}",
                (status_x, status_y + 3 * line_height),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0) if not detection["unstable"] else (0, 0, 255),
                2,
            )

        if self.is_recording:
            cv2.circle(image_out, (30, 30), 10, (0, 0, 255), -1)
            cv2.putText(
                image_out,
                "REC",
                (10, 100),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2,
            )

    def start_recording(self, frame, video_path=None):
        if self.is_recording:
            return
        output_dir = r"C:\Users\siddh\Downloads\fall Ai"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_name = (
            os.path.basename(video_path).split(".")[0] if video_path else "camera_feed"
        )
        self.output_path = os.path.join(
            output_dir, f"fall_{video_name}_{timestamp}.mp4"
        )
        height, width = frame.shape[:2]
        self.recording_resolution = (width, height)

        with self.recording_lock:
            self.output_video = cv2.VideoWriter(
                self.output_path,
                cv2.VideoWriter_fourcc(*"mp4v"),
                self.recording_fps,
                (width, height),
                True,
            )
            if not self.output_video.isOpened():
                print("ERROR: Failed to create video writer")
                self.output_path = os.path.join(
                    output_dir, f"fall_{video_name}_{timestamp}_fallback.avi"
                )
                self.output_video = cv2.VideoWriter(
                    self.output_path,
                    cv2.VideoWriter_fourcc(*"MJPG"),
                    self.recording_fps,
                    (width, height),
                )
            self.is_recording = True
            self.record_start_time = time.time()
            print(f"Started recording to {self.output_path}")
            self.stop_recording = False
            self.recording_thread = threading.Thread(target=self._recording_monitor)
            self.recording_thread.daemon = True
            self.recording_thread.start()

    def _recording_monitor(self):
        while not self.stop_recording:
            if self.is_recording and self.record_start_time:
                elapsed_time = time.time() - self.record_start_time
                if elapsed_time > self.record_duration:
                    self.stop_recording = True
                    with self.recording_lock:
                        if self.output_video:
                            self.output_video.release()
                            self.output_video = None
                        self.is_recording = False
                        print(
                            f"Stopped recording after {elapsed_time:.1f} seconds. Video saved to {self.output_path}"
                        )
                    break
            time.sleep(1)

    def add_frame_to_recording(self, frame):
        with self.recording_lock:
            if self.is_recording and self.output_video:
                try:
                    if self.recording_resolution:
                        if (
                            frame.shape[1] != self.recording_resolution[0]
                            or frame.shape[0] != self.recording_resolution[1]
                        ):
                            frame = cv2.resize(frame, self.recording_resolution)
                    if frame.shape[2] != 3:
                        frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
                    self.output_video.write(frame)
                except Exception as e:
                    print(f"Error adding frame to recording: {e}")

    def _process_frame_internal(
        self, image, frame_number, video_path=None, show_display=True
    ):
        h, w = image.shape[:2]
        max_width = 960
        if w > max_width:
            scale = max_width / w
            new_width = int(w * scale)
            new_height = int(h * scale)
            image_small = cv2.resize(image, (new_width, new_height))
            process_image = image_small
        else:
            process_image = image

        rgb_image = cv2.cvtColor(process_image, cv2.COLOR_BGR2RGB)
        result = self.pose.process(rgb_image)
        image_out = image.copy()
        frame_fall_detected = False
        person_results = {}

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(
            image_out,
            timestamp,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

        if result.pose_landmarks:
            landmarks = result.pose_landmarks.landmark
            first_person_keypoints = self.get_body_keypoints(landmarks)
            all_detected_people = [first_person_keypoints]
            person_id_to_keypoints = self.person_tracker.update(all_detected_people)

            for person_id, keypoints in person_id_to_keypoints.items():
                person_data = self._get_person_fall_data(person_id)
                is_floor_sitting = self._detect_floor_sitting_improved(keypoints)
                current_context = "floor_sitting" if is_floor_sitting else "standing"

                if "context_history" not in person_data:
                    person_data["context_history"] = []
                person_data["context_history"].append(current_context)
                if len(person_data["context_history"]) > 30:
                    person_data["context_history"].pop(0)

                abnormal_posture = self.detect_abnormal_posture(keypoints, person_data)
                lying_position = self.detect_lying_position(keypoints, person_data)
                sudden_movement = self.detect_sudden_movement(keypoints, person_data)
                fall_detected, detection_state = self.check_all_fall_conditions(
                    abnormal_posture, lying_position, sudden_movement, person_data
                )

                if fall_detected:
                    person_data["fall_counter"] = person_data.get("fall_counter", 0) + 1
                    person_data["stable_counter"] = 0
                else:
                    person_data["fall_counter"] = max(
                        0, person_data.get("fall_counter", 0) - 1
                    )
                    person_data["stable_counter"] = (
                        person_data.get("stable_counter", 0) + 1
                    )

                required_fall_frames = 5
                if person_data[
                    "fall_counter"
                ] >= required_fall_frames and not person_data.get(
                    "fall_detected", False
                ):
                    person_data["fall_detected"] = True
                    if person_id not in self.falls_detected:
                        self.falls_detected[person_id] = []
                    self.falls_detected[person_id].append(frame_number)
                    if not self.is_recording:
                        self.start_recording(image_out, video_path)

                    # Send SMS with cooldown check
                    current_time = time.time()
                    if current_time - self.last_sms_time >= self.sms_cooldown:
                        print(f"🚨 FALL DETECTED at frame {frame_number} - Sending SMS")
                        success = send_emergency_sms()
                        if success:
                            self.last_sms_time = current_time
                            person_data["sms_sent"] = True
                        else:
                            print(
                                "Failed to send SMS, will retry on next detection if cooldown allows"
                            )
                    else:
                        print(
                            f"SMS cooldown active: {int(self.sms_cooldown - (current_time - self.last_sms_time))} seconds remaining"
                        )

                    frame_fall_detected = True

                if person_data.get(
                    "stable_counter", 0
                ) >= self.stable_frames_threshold and person_data.get(
                    "fall_detected", False
                ):
                    person_data["fall_detected"] = False
                    person_data["sms_sent"] = False

                person_results[person_id] = {
                    "keypoints": keypoints,
                    "fall_detected": person_data.get("fall_detected", False),
                    "context": current_context,
                }

            if show_display or self.always_show_skeleton:
                for person_id, result_data in person_results.items():
                    self._draw_skeleton(
                        image_out,
                        result_data["keypoints"],
                        self.person_fall_data[person_id],
                    )
        else:
            if show_display:
                cv2.putText(
                    image_out,
                    "No person detected",
                    (int(image_out.shape[1] / 2) - 100, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2,
                )

        if self.is_recording:
            self.add_frame_to_recording(image_out)
        return image_out, frame_fall_detected

    def process_frame(self, frame, frame_number, video_path=None, show_display=True):
        try:
            return self._process_frame_internal(
                frame, frame_number, video_path, show_display
            )
        except Exception as e:
            print(f"Error processing frame: {e}")
            return frame, False


def test_twilio_directly():
    print("\n===== TESTING TWILIO SMS FUNCTIONALITY =====")
    result = send_emergency_sms()
    if result:
        print("✅ Twilio test SUCCESSFUL! Check your phone for the message.")
    else:
        print("❌ Twilio test FAILED. Please check your credentials and connection.")
    print("============================================\n")
    return result


def main():
    fall_detector = FallDetector()
    print("\n" + "=" * 80)
    print("Fall Detection System Starting")
    print("=" * 80)
    print("• Twilio SMS alerts enabled")
    print("• Video recording enabled")
    print("• Press 'q' to quit")
    print("• Press 't' to test SMS functionality")
    print("=" * 80 + "\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    frame_count = 0
    cv2.namedWindow("Fall Detection", cv2.WINDOW_NORMAL)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to read frame from camera.")
                break
            processed_frame, fall_detected = fall_detector.process_frame(
                frame, frame_count, show_display=True
            )
            cv2.imshow("Fall Detection", processed_frame)
            if fall_detected:
                print(f"Fall detected at frame {frame_count}!")
            frame_count += 1
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("t"):
                print("Testing SMS functionality...")
                threading.Thread(target=test_twilio_directly).start()
    except KeyboardInterrupt:
        print("Stopped by user.")
    except Exception as e:
        print(f"Error during processing: {e}")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        fall_detector.reset()
        print("Fall detection stopped.")


if __name__ == "__main__":
    main()
