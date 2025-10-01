#!/usr/bin/env python3
"""
SimplyCompete Participant Fetcher
Fetches participants from SimplyCompete competitions with pagination support.
"""

import requests
import json
import os
from typing import List, Dict, Optional

class SimplyCompeteAPI:
    def __init__(self):
        self.base_url = "https://worldtkd.simplycompete.com"
        self.session = requests.Session()
        
        # Set up headers (keep user-agent and other non-sensitive headers)
        self.session.headers.update({
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        })
        
        # Load cookies from environment variables for security
        self._setup_cookies()
    
    def _setup_cookies(self):
        """Set up cookies from environment variables for security."""
        # Check for cookies in environment variables
        cf_clearance = os.getenv('SIMPLYCOMPETE_CF_CLEARANCE')
        cookie_consent = os.getenv('SIMPLYCOMPETE_COOKIE_CONSENT', 'yes')
        
        if cf_clearance:
            self.session.cookies.update({
                'cookieconsent_dismissed': cookie_consent,
                'cf_clearance': cf_clearance
            })
            print("✅ Loaded authentication cookies from environment variables")
            print(f"🔐 CF Clearance token: {cf_clearance[:20]}...{cf_clearance[-10:]}")
        else:
            print("⚠️  No CF_CLEARANCE token found in environment variables")
            print("   Set SIMPLYCOMPETE_CF_CLEARANCE environment variable for authenticated requests")
    
    def fetch_all_participants(self, event_id: str, node_id: Optional[str] = None) -> List[Dict]:
        """
        Fetch all participants for a given event with pagination support.
        
        Args:
            event_id: The SimplyCompete event ID
            node_id: Optional node ID for specific divisions
            
        Returns:
            List of all participants from all pages
        """
        all_participants = []
        page_no = 0
        max_pages = 100  # Safety limit
        
        print(f"🔍 Fetching participants for event: {event_id}")
        
        while page_no < max_pages:
            try:
                # Build URL
                url = f"{self.base_url}/events/getEventParticipant"
                params = {
                    'eventId': event_id,
                    'isHideUnpaidEntries': 'false',
                    'pageNo': page_no
                }
                
                if node_id:
                    params['nodeId'] = node_id
                    params['nodeLevel'] = 'EventRole'
                
                # Set referer for this specific event
                self.session.headers['referer'] = f"{self.base_url}/eventDetails/{event_id}/5"
                
                print(f"📄 Fetching page {page_no}...")
                response = self.session.get(url, params=params)
                
                if not response.ok:
                    print(f"❌ Failed to fetch page {page_no}: {response.status_code} {response.reason}")
                    print(f"📝 Response headers: {dict(response.headers)}")
                    try:
                        error_content = response.text[:500]  # First 500 chars
                        print(f"📄 Response content: {error_content}")
                    except:
                        print("📄 Could not read response content")
                    break
                
                data = response.json()
                
                # Navigate to participant list in the nested JSON structure
                participant_list = data.get('data', {}).get('data', {}).get('participantList', [])
                
                if not participant_list:
                    print(f"✅ No more participants found on page {page_no}")
                    break
                
                print(f"📋 Found {len(participant_list)} participants on page {page_no}")
                all_participants.extend(participant_list)
                page_no += 1
                
            except requests.RequestException as e:
                print(f"❌ Network error on page {page_no}: {e}")
                break
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing error on page {page_no}: {e}")
                break
            except Exception as e:
                print(f"❌ Unexpected error on page {page_no}: {e}")
                break
        
        print(f"🎉 Total participants fetched: {len(all_participants)}")
        return all_participants
    
    def print_participants(self, participants: List[Dict]):
        """Print participant information in a readable format."""
        if not participants:
            print("📭 No participants found")
            return
        
        print(f"\n{'=' * 80}")
        print(f"PARTICIPANT LIST ({len(participants)} athletes)")
        print(f"{'=' * 80}")
        
        for i, participant in enumerate(participants, 1):
            # Extract name
            first_name = participant.get('preferredFirstName', '') or participant.get('firstName', '')
            last_name = participant.get('preferredLastName', '') or participant.get('lastName', '')
            name = f"{first_name} {last_name}".strip()
            
            # Extract other details
            country = participant.get('country', 'Unknown')
            division = participant.get('divisionName', 'No Division')
            club = participant.get('clubName', '') or participant.get('customClubName', '')
            license_id = participant.get('wtfLicenseId', '')
            seed = participant.get('seedNumber', '')
            
            print(f"{i:3d}. {name}")
            print(f"     Country: {country}")
            print(f"     Division: {division}")
            if club:
                print(f"     Club: {club}")
            if license_id:
                print(f"     License: {license_id}")
            if seed:
                print(f"     Seed: {seed}")
            print()
    
    def save_to_json(self, participants: List[Dict], filename: str = "participants.json"):
        """Save participants to a JSON file."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump({
                    'total_participants': len(participants),
                    'participants': participants
                }, f, indent=2, ensure_ascii=False)
            print(f"💾 Saved {len(participants)} participants to {filename}")
        except Exception as e:
            print(f"❌ Error saving to {filename}: {e}")


def main():
    """Main function to fetch participants for a specific competition."""
    
    # Configuration - Change these values for different competitions
    EVENT_ID = "11f06186-d592-e11a-a2a2-0225d1e4088f"  # 3rd Small States Countries Championships 2025
    COMPETITION_NAME = "3rd Small States Countries Championships 2025"
    NODE_ID = None  # Optional - specify if you need a specific division
    
    print(f"🏆 Fetching participants for: {COMPETITION_NAME}")
    print(f"📅 Event ID: {EVENT_ID}")
    print("-" * 80)
    
    # Initialize API client
    api = SimplyCompeteAPI()
    
    # Fetch all participants
    participants = api.fetch_all_participants(EVENT_ID, NODE_ID)
    
    if participants:
        # Print participant details
        api.print_participants(participants)
        
        # Save to JSON file
        api.save_to_json(participants, "participants.json")
        
        # Summary statistics
        print(f"\n📊 SUMMARY:")
        print(f"Total Participants: {len(participants)}")
        
        # Count by division
        divisions = {}
        for p in participants:
            div = p.get('divisionName', 'No Division')
            divisions[div] = divisions.get(div, 0) + 1
        
        print(f"Weight Divisions: {len(divisions)}")
        for div, count in sorted(divisions.items()):
            print(f"  - {div}: {count} athletes")
    
    else:
        print("⚠️  No participants found.")
        print("\n🔧 TROUBLESHOOTING:")
        print("The API is protected by Cloudflare. To fix this:")
        print("1. Update your cf_clearance token if it has expired")
        print("2. Your token should look like: L8fTr7iblL8FZ3oUcmmaV4i7Ut3mwX14ONTALaf39Ks-...")
        print("3. Set it in Replit Secrets as SIMPLYCOMPETE_CF_CLEARANCE")
        print("4. The token from your working curl command should be used")


if __name__ == "__main__":
    main()