from flask import Flask, jsonify
from sync_competitions import get_competitions, save_competitions, get_competitions_from_db

app = Flask(__name__)

@app.route('/competitions/sync', methods=['GET'])
def sync_competitions():
    """
    Endpoint to fetch competitions from SimplyCompete API and save to database.
    
    Returns:
        JSON response with competitions data
    """
    try:
        print("🚀 Starting competition sync...")
        
        # Fetch competitions from API
        competitions = get_competitions()
        
        if not competitions:
            return jsonify({
                "success": False,
                "message": "No competitions found or API call failed",
                "count": 0,
                "competitions": []
            }), 404
        
        # Save to database
        save_competitions(competitions)
        
        # Return the synced competitions
        return jsonify({
            "success": True,
            "message": f"Successfully synced {len(competitions)} competitions",
            "count": len(competitions),
            "competitions": competitions
        })
        
    except Exception as e:
        print(f"❌ Error in sync_competitions: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "competitions": []
        }), 500


@app.route('/competitions', methods=['GET'])
def get_competitions_endpoint():
    """
    Endpoint to return all competitions currently in the database.
    
    Returns:
        JSON response with stored competitions
    """
    try:
        competitions = get_competitions_from_db()
        
        return jsonify({
            "success": True,
            "count": len(competitions),
            "competitions": competitions
        })
        
    except Exception as e:
        print(f"❌ Error getting competitions from DB: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "competitions": []
        }), 500


@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "running",
        "message": "Flask API for SimplyCompete integration with Cloudflare bypass",
        "endpoints": [
            "/competitions/sync - Fetch and sync competitions from API",
            "/competitions - Get stored competitions from database"
        ]
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)