
import requests
import json

def test_simplycompete_api():
    # Example competition ID (Albania Open 2025 from your codebase)
    event_id = "11f0475f-66b5-53f3-95c6-0225d1e4088f"
    node_id = "11f0475f-66c7-f1a3-95c6-0225d1e4088f"  # Fixed the node_id
    
    url = f"https://worldtkd.simplycompete.com/events/getEventParticipant?eventId={event_id}&isHideUnpaidEntries=false&pageNo=0&nodeId={node_id}&nodeLevel=EventRole"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Referer": "https://worldtkd.simplycompete.com"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                print("✅ JSON Response (formatted):")
                print(json.dumps(json_data, indent=2)[:1000])  # First 1000 chars
                
                # Check if we have participant data
                if 'data' in json_data and 'data' in json_data['data']:
                    participants = json_data['data']['data'].get('participantList', [])
                    print(f"\n📊 Found {len(participants)} participants")
                    
                    if participants:
                        print("\n👥 Sample participant:")
                        sample = participants[0]
                        print(f"Name: {sample.get('preferredFirstName', '')} {sample.get('preferredLastName', '')}")
                        print(f"Country: {sample.get('country', 'N/A')}")
                        print(f"Division: {sample.get('divisionName', 'N/A')}")
                        print(f"License: {sample.get('wtfLicenseId', 'N/A')}")
                else:
                    print("❌ No participant data found in response")
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw response: {response.text[:500]}")
        else:
            print(f"❌ Error response: {response.status_code}")
            print(f"Response text: {response.text[:500]}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_simplycompete_api()
