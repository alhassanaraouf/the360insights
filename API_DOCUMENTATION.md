# World Taekwondo Data Scraper API Documentation

## Overview

The World Taekwondo Data Scraper API provides a RESTful interface for extracting athlete ranking data from the World Taekwondo Global Membership System. This API allows you to programmatically access taekwondo athlete rankings with advanced filtering and export capabilities.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, no authentication is required for this API.

## Content Type

All requests and responses use `application/json` content type.

## Endpoints

### 1. Root Endpoint

**GET** `/`

Returns basic API information.

**Response:**
```json
{
  "message": "World Taekwondo Data Scraper API",
  "version": "1.0.0",
  "documentation": "/docs",
  "health": "/health"
}
```

### 2. Health Check

**GET** `/health`

Returns the health status of the API.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-14T20:00:00.000Z",
  "service": "World Taekwondo Data Scraper API"
}
```

### 3. Get Available Options

**GET** `/options`

Returns all available options for scraping parameters.

**Response:**
```json
{
  "ranking_categories": [
    "World Kyorugi Rankings",
    "Olympic Kyorugi Rankings"
  ],
  "sub_categories": {
    "World Kyorugi Rankings": ["World Senior Division"],
    "Olympic Kyorugi Rankings": ["Olympic Senior Division"]
  },
  "weight_divisions": {
    "World Senior Division": [
      "M-54 kg", "M-58 kg", "M-63 kg", "M-68 kg", "M-74 kg", "M-80 kg", "M-87 kg", "M+87 kg",
      "W-46 kg", "W-49 kg", "W-53 kg", "W-57 kg", "W-62 kg", "W-67 kg", "W-73 kg", "W+73 kg",
      "All Weights"
    ],
    "Olympic Senior Division": [
      "M-58 kg", "M-68 kg", "M-80 kg", "M+80 kg",
      "W-49 kg", "W-57 kg", "W-67 kg", "W+67 kg",
      "All Weights"
    ]
  },
  "countries": ["Afghanistan", "Albania", "Algeria", "..."],
  "months": ["January", "February", "March", "..."],
  "years": [2020, 2021, 2022, 2023, 2024, 2025, 2026]
}
```

### 4. Start Scraping Task

**POST** `/scrape`

Initiates a new scraping task. Returns immediately with a task ID for tracking progress.

**Request Body:**
```json
{
  "ranking_category": "World Kyorugi Rankings",
  "sub_category": "World Senior Division",
  "weight_division": "M-54 kg",
  "athlete_filter": "John",
  "country_filter": "Egypt, United Arab Emirates",
  "month": "July",
  "year": 2025,
  "max_results": 100,
  "delay": 2
}
```

**Parameters:**
- `ranking_category` (required): "World Kyorugi Rankings" or "Olympic Kyorugi Rankings"
- `sub_category` (required): "World Senior Division" or "Olympic Senior Division"
- `weight_division` (required): Weight division (e.g., "M-54 kg", "W-57 kg", "All Weights")
- `athlete_filter` (optional): Filter by athlete name (partial match)
- `country_filter` (optional): Filter by country (comma-separated for multiple)
- `month` (required): Month name (e.g., "July")
- `year` (required): Year (e.g., 2025)
- `max_results` (optional): Maximum number of results to return (default: 100)
- `delay` (optional): Delay between requests in seconds (default: 2)

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "message": "Scraping task initiated. Use /status/{task_id} to check progress."
}
```

### 5. Get Task Status

**GET** `/status/{task_id}`

Returns the current status of a scraping task.

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "message": "Processing Egypt (1/2)...",
  "progress": {
    "percentage": 50,
    "message": "Processing Egypt (1/2)..."
  },
  "data": null,
  "total_results": null,
  "processing_time": null
}
```

**Status Values:**
- `started`: Task has been initiated
- `running`: Task is currently processing
- `completed`: Task completed successfully
- `failed`: Task failed with an error
- `cancelled`: Task was cancelled by user

### 6. List Active Tasks

**GET** `/tasks`

Returns a list of all active tasks.

**Response:**
```json
[
  {
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "message": "Processing Egypt (1/2)...",
    "start_time": "2025-07-14T20:00:00.000Z"
  }
]
```

### 7. Cancel Task

**DELETE** `/tasks/{task_id}`

Cancels a running task.

**Response:**
```json
{
  "message": "Task 550e8400-e29b-41d4-a716-446655440000 cancelled"
}
```

### 8. Get Results

**GET** `/results/{task_id}?format=json`

Returns the results from a completed task.

**Parameters:**
- `format` (optional): Output format (currently only "json" is supported)

**Response:**
```json
[
  {
    "ranking": "1",
    "display_ranking": "1st",
    "name": "Moataz Bellah ASEM ATA ABU SREE'",
    "country": "Egypt",
    "gender": "Male",
    "weight_division": "M-54 kg",
    "points": "61.92",
    "change": "0",
    "profilePic": "https://worldtkd.simplycompete.com/images/profiles/...",
    "category": "World Kyorugi Rankings",
    "sub_category": "World Senior Division",
    "month": "July",
    "year": 2025,
    "scraped_date": "2025-07-14T20:00:00.000Z"
  }
]
```

### 9. Test Connection

**GET** `/test-connection`

Tests the connection to the target website.

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "timestamp": "2025-07-14T20:00:00.000Z"
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "detail": {
    "errors": [
      "Invalid ranking category",
      "Year must be between 2020 and 2026"
    ]
  }
}
```

## Usage Examples

### 1. Basic Scraping Workflow

```bash
# 1. Start a scraping task
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "ranking_category": "World Kyorugi Rankings",
    "sub_category": "World Senior Division",
    "weight_division": "M-54 kg",
    "country_filter": "Egypt",
    "month": "July",
    "year": 2025,
    "max_results": 50
  }'

# Response: {"task_id": "550e8400-e29b-41d4-a716-446655440000", ...}

# 2. Check task status
curl "http://localhost:8000/status/550e8400-e29b-41d4-a716-446655440000"

# 3. Get results when completed
curl "http://localhost:8000/results/550e8400-e29b-41d4-a716-446655440000"
```

### 2. Multiple Countries

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "ranking_category": "World Kyorugi Rankings",
    "sub_category": "World Senior Division",
    "weight_division": "M-54 kg",
    "country_filter": "Egypt, United Arab Emirates, Jordan",
    "month": "July",
    "year": 2025
  }'
```

### 3. Get Available Options

```bash
curl "http://localhost:8000/options"
```

### 4. Health Check

```bash
curl "http://localhost:8000/health"
```

## Interactive Documentation

The API provides interactive documentation at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Rate Limiting

The API includes built-in rate limiting through the `delay` parameter, which controls the delay between requests to the target website. The default delay is 2 seconds.

## Data Format

### Athlete Data Structure

Each athlete record contains the following fields:

- `ranking`: Numeric ranking position
- `display_ranking`: Formatted ranking with ordinal suffix (e.g., "1st", "2nd")
- `name`: Full name of the athlete
- `country`: Country/nation name
- `gender`: "Male" or "Female"
- `weight_division`: Weight division (e.g., "M-54 kg")
- `points`: Ranking points as string
- `change`: Change from previous ranking
- `profilePic`: URL to profile picture
- `category`: Ranking category
- `sub_category`: Sub-category
- `month`: Month of data
- `year`: Year of data
- `scraped_date`: Timestamp when data was scraped

## Technical Notes

### Multi-Country Processing

When multiple countries are specified in `country_filter`, the API:
1. Makes separate requests for each country
2. Combines the results
3. Provides progress updates for each country
4. Applies the specified delay between country requests

### Background Processing

All scraping operations run as background tasks, allowing:
- Non-blocking API responses
- Progress tracking
- Task cancellation
- Multiple concurrent operations

### Error Handling

The API includes comprehensive error handling for:
- Invalid parameters
- Network connectivity issues
- Data processing errors
- Task management errors

## Deployment

To run the API server:

```bash
# Install dependencies
pip install fastapi uvicorn pydantic

# Run the server
python api.py

# Or using uvicorn directly
uvicorn api:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.