import base64
import requests
from PIL import Image
import io

# Create a dummy image
img = Image.new('RGB', (100, 100), color = 'white')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr = img_byte_arr.getvalue()

# Encode to base64
encoded_string = base64.b64encode(img_byte_arr).decode('utf-8')

print("Sending request to local AI service...")
try:
    response = requests.post(
        "http://localhost:8000/describe-scene",
        json={"image_base64": encoded_string},
        timeout=30 # 30 seconds should be enough for initialization and first run
    )
    
    if response.status_code == 200:
        print("Success!")
        print(response.json())
    else:
        print(f"Failed with status {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
