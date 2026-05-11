import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("VITE_SUPABASE_URL") + "/rest/v1/daily_trips?select=trip_date&limit=5"
headers = {
    "apikey": os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY"),
    "Authorization": "Bearer " + os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
}
response = requests.get(url, headers=headers)
print(response.json())
