import os
import requests
import json

with open('.env') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_URL='):
            url = line.split('=', 1)[1].strip().strip('"')
        if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY='):
            key = line.split('=', 1)[1].strip().strip('"')

api_url = url + "/rest/v1/daily_trips?select=trip_date&limit=5"
headers = {
    "apikey": key,
    "Authorization": "Bearer " + key
}
response = requests.get(api_url, headers=headers)
print(response.json())
