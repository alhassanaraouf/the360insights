import json
import os
import sqlite3
import requests
from typing import List, Dict, Any, Optional
from playwright.sync_api import sync_playwright


def get_cookies() -> Dict[str, str]:
    """
    Get Cloudflare cookies by loading them from cookies.json or refreshing with Playwright.
    
    Returns:
        Dict[str, str]: Dictionary of cookies
    """
    cookies_file = "cookies.json"
    
    # Check if cookies file exists and is valid
    if os.path.exists(cookies_file):
        try:
            with open(cookies_file, 'r') as f:
                cookies_data = json.load(f)
                
            # Convert to simple dict format for requests
            cookies_dict = {}
            for cookie in cookies_data:
                cookies_dict[cookie['name']] = cookie['value']
                
            # Check if we have cf_clearance cookie
            if 'cf_clearance' in cookies_dict:
                print("✅ Loaded existing cookies from cookies.json")
                return cookies_dict
        except (json.JSONDecodeError, KeyError) as e:
            print(f"⚠️ Invalid cookies file: {e}")
    
    # If no valid cookies, get fresh ones with Playwright
    print("🔄 Refreshing cookies with Playwright...")
    return _refresh_cookies_with_playwright()


def _refresh_cookies_with_playwright() -> Dict[str, str]:
    """
    Use Playwright to get fresh Cloudflare cookies.
    
    Returns:
        Dict[str, str]: Dictionary of cookies
    """
    with sync_playwright() as p:
        # Launch browser with necessary flags
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        )
        
        page = browser.new_page()
        
        # Set realistic user agent
        page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        try:
            # Navigate to the events page
            print("📂 Opening SimplyCompete events page...")
            page.goto("https://worldtkd.simplycompete.com/events", wait_until="networkidle")
            
            # Wait for page to fully load and Cloudflare to issue cookies
            page.wait_for_timeout(5000)  # Wait 5 seconds for any challenges
            
            # Get all cookies
            cookies = page.context.cookies()
            
            # Save cookies to file
            with open("cookies.json", 'w') as f:
                json.dump(cookies, f, indent=2)
            
            # Convert to simple dict format
            cookies_dict = {}
            for cookie in cookies:
                cookies_dict[cookie['name']] = cookie['value']
            
            print(f"💾 Saved {len(cookies)} cookies to cookies.json")
            
            # Check if we got cf_clearance
            if 'cf_clearance' in cookies_dict:
                print("✅ Successfully obtained cf_clearance cookie")
            else:
                print("⚠️ No cf_clearance cookie found, but proceeding...")
            
            return cookies_dict
            
        except Exception as e:
            print(f"❌ Error getting cookies: {e}")
            return {}
        finally:
            browser.close()


def get_competitions() -> List[Dict[str, Any]]:
    """
    Fetch competitions from SimplyCompete API using cookies.
    
    Returns:
        List[Dict]: List of competitions with id, name, and startDate
    """
    url = "https://worldtkd.simplycompete.com/events/eventList"
    params = {
        "da": "true",
        "eventType": "All", 
        "invitationStatus": "all",
        "isArchived": "false",
        "itemsPerPage": "12",
        "pageNumber": "1"
    }
    
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Priority": "u=1, i",
        "Pragma": "no-cache",
        "Referer": "https://worldtkd.simplycompete.com/events",
        "Sec-Ch-Ua": '"Not.A/Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            # Get cookies
            cookies = get_cookies()
            
            if not cookies:
                print("❌ No cookies available")
                return []
            
            print(f"🔄 Attempting API call (attempt {attempt + 1}/{max_retries})...")
            
            # Make request with cookies
            response = requests.get(url, params=params, headers=headers, cookies=cookies)
            
            if response.status_code == 403:
                print("🔒 Got 403 Forbidden, refreshing cookies...")
                # Remove existing cookies file to force refresh
                if os.path.exists("cookies.json"):
                    os.remove("cookies.json")
                continue
            
            response.raise_for_status()
            
            data = response.json()
            print(f"✅ API call successful, response size: {len(str(data))} chars")
            
            # Extract competitions data from the response
            events = data.get('events', data.get('data', data.get('content', data)))
            
            if isinstance(events, list):
                competitions = []
                for event in events:
                    competition = {
                        "id": event.get("id"),
                        "name": event.get("name"), 
                        "startDate": event.get("startDate", event.get("date"))
                    }
                    # Only add if we have required fields
                    if competition["id"] and competition["name"]:
                        competitions.append(competition)
                
                print(f"📊 Extracted {len(competitions)} competitions")
                return competitions
            else:
                print(f"⚠️ Unexpected response structure: {type(events)}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request error on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                return []
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            return []
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return []
    
    return []


def save_competitions(competitions: List[Dict[str, Any]]) -> None:
    """
    Save competitions to SQLite database.
    
    Args:
        competitions: List of competition dictionaries
    """
    conn = None
    try:
        # Connect to SQLite database
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS competitions (
                id TEXT PRIMARY KEY,
                name TEXT,
                start_date TEXT
            )
        ''')
        
        # Insert or replace competitions
        for comp in competitions:
            cursor.execute('''
                INSERT OR REPLACE INTO competitions (id, name, start_date)
                VALUES (?, ?, ?)
            ''', (comp.get('id'), comp.get('name'), comp.get('startDate')))
        
        conn.commit()
        print(f"💾 Saved {len(competitions)} competitions to database")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        if conn:
            conn.close()


def get_competitions_from_db() -> List[Dict[str, Any]]:
    """
    Get all competitions from SQLite database.
    
    Returns:
        List[Dict]: List of competitions from database
    """
    conn = None
    try:
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, start_date FROM competitions ORDER BY start_date')
        rows = cursor.fetchall()
        
        competitions = []
        for row in rows:
            competitions.append({
                'id': row[0],
                'name': row[1],
                'start_date': row[2]
            })
        
        return competitions
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return []
    finally:
        if conn:
            conn.close()