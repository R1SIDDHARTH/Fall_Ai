from twilio.rest import Client

# Twilio credentials (make sure to keep these secure in production)
TWILIO_ACCOUNT_SID = "AC084d5387ee90e933a1ff023337cac58e"
TWILIO_AUTH_TOKEN = (
    "ebd99c6e9c2eef99880fd72d10439098"  # Replace with actual auth token in production
)
TWILIO_PHONE_NUMBER = "+12186566943"
EMERGENCY_CONTACT = "+919080557940"  # Replace with actual emergency contact number


# Create Twilio client
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Send SMS
message = client.messages.create(
    body="🚨 Alert: A fall has been detected. Please check in immediately.",
    from_=TWILIO_PHONE_NUMBER,
    to=EMERGENCY_CONTACT,
)

print("✅ Message sent! SID:", message.sid)
