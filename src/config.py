AWS_ACCESS_KEY = "AKIA5HDDAMCIQ56YGCWY"  # Your access key
AWS_SECRET_KEY = "3SwAkVk0AFvHWp5R6MknpELae3ZotrZ3AG7qvjiz"  # Your secret key
AWS_REGION = "ap-southeast-2"  # Your region appears to be ap-southeast-2
S3_BUCKET_NAME = "fall-detection-videos"
CLOUDFRONT_DOMAIN = "your-cloudfront-domain.cloudfront.net"  # Optional

# Twilio Credentials
TWILIO_ACCOUNT_SID = (
    "AC084d5387ee90e933a1ff023337cac58e"  # Replace with your actual SID
)
TWILIO_AUTH_TOKEN = "ebd99c6e9c2eef99880fd72d10439098"  # Replace with your actual token
TWILIO_FROM_PHONE = "+12186566943"  # Replace with your Twilio phone number
TWILIO_TO_PHONE = "+919080557940"  # Replace with the emergency contact phone number

# TwiML URL for emergency calls
# Create a TwiML Bin in Twilio console with something like:
# <Response><Say>Emergency! A fall has been detected and the person is not moving. Please check immediately.</Say><Pause length="1"/><Say>This is an automated emergency call from the fall detection system.</Say></Response>
TWILIO_TWIML_URL = "https://handler.twilio.com/twiml/YOUR_TWIML_BIN_ID"  # Replace with your TwiML Bin URL
