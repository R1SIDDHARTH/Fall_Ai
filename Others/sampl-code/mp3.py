import pygame
import os
import time

# Initialize mixer
pygame.mixer.init()

# Paths to audio files
check_ok_audio_path = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Are-u-ok.mp3"
emergency_audio_path = r"C:\ALL folder in dexstop\PycharmProjects\cctv_web_app_firebase_1\cctv_web_app\src\Alert\Emergency.mp3"

# Ask the user
user_input = input("Are you okay? Type 'yes' or 'no': ").strip().lower()

try:
    if user_input == "yes":
        if os.path.exists(check_ok_audio_path):
            pygame.mixer.music.load(check_ok_audio_path)
            pygame.mixer.music.play()
            print("Playing 'Are you okay' audio...")
        else:
            print("Check-ok audio file not found.")
    elif user_input == "no":
        if os.path.exists(emergency_audio_path):
            pygame.mixer.music.load(emergency_audio_path)
            pygame.mixer.music.play()
            print("Playing emergency audio...")
        else:
            print("Emergency audio file not found.")
    else:
        print("Invalid input. Please type 'yes' or 'no'.")

    # Wait until the audio finishes playing
    while pygame.mixer.music.get_busy():
        time.sleep(0.1)

except Exception as e:
    print(f"Error playing audio: {e}")
