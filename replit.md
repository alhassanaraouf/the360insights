# The360 Insights - Sports Analytics Dashboard

## Overview
The360 Insights is a comprehensive sports analytics platform for Taekwondo athletes. It provides AI-powered performance insights, opponent analysis, training planning, and injury prevention capabilities. The platform aims to be a full-stack web application offering a 360-degree view of athlete performance, strategic insights, and personalized recommendations. Its business vision includes enhancing athlete performance, optimizing training, and minimizing injury risks within the Taekwondo community, with potential for broader sports applications.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React 18 with TypeScript for the frontend, styled with Tailwind CSS and shadcn/ui component library built on Radix UI primitives. The design focuses on a consistent, customizable appearance.

### Technical Implementations
-   **Frontend**: React 18, TypeScript, Wouter for routing, TanStack Query for state management, Vite as build tool.
-   **Backend**: Node.js with TypeScript, Express.js for REST API, Drizzle ORM for database interactions.
-   **Database**: PostgreSQL (Neon serverless) for relational data persistence.
-   **AI Integration**: Gemini 2.0 Flash (via @google/genai SDK) for video analysis with Files API; OpenAI API (GPT-4o) for performance insights, opponent analysis, and training plans.
-   **Video Processing**: Gemini Files API for video upload and processing, range-based HTTP streaming for efficient video playback.
-   **Session Management**: Replit Key Value Store for persistent authentication sessions.
-   **Real-time Features**: WebSocket integration for live match analysis.
-   **Data Management**: Data scraper, PDF report generation, multi-language support (English, Arabic), competition sync with SimplyCompete API.
-   **Authentication**: Local email/password authentication with Passport.js and bcrypt password hashing.
-   **Object Storage**: Replit Object Storage for athlete profile pictures, competition logos, video analysis files, and other assets. Videos are stored in environment-specific buckets (dev/prod) for proper isolation.

### Feature Specifications
-   **Dashboard System**: Athlete 360° overview, performance analytics, KPI tracking, strengths/weaknesses analysis.
-   **AI-Powered Features**: Opponent analysis, personalized training planner, injury prevention, live match analysis, performance insights.
-   **Athlete Management**: Comprehensive directory with search, filter, sort, edit, and delete functionalities.
-   **Competitions Directory**: Full-featured competition browser with search, filters (status, location), sorting, competition cards with logos, and comprehensive detailed popup modals showing all competition information (location, dates, category, grade level, competition type, ranking points, registration deadline, organizer, sync metadata) - following the same pattern as Athletes directory. Defaults to showing upcoming competitions on page load.
-   **Competition Sync**: Backend-only participant syncing using Puppeteer with stealth mode (JavaScript equivalent of Python's cloudscraper) to bypass Cloudflare protection; Fetches and processes participants server-side (page 0 only, 500 max participants) with intelligent athlete matching: primary match by SimplyCompete userId, fallback to name+nationality matching, automatic userId backfilling for existing athletes.
-   **Video Analysis System**: AI-powered Taekwondo match analysis with interactive video playback (match analysis only):
    - Match Analysis: Full match breakdown with scoring, techniques, and tactical insights - always analyzes the complete match
    - Interactive Video Player: Purple gradient background with centered play button overlay, modern controls (skip back/forward, settings, PiP), timeline markers for kicks, scores, punches, and violations, auto-hide controls
    - Side-by-side Stats Display: Real-time visualization of player scores, kicks, and warnings
    - Video Storage: Videos uploaded to Replit Object Storage with environment-specific buckets (dev/prod) for proper isolation
    - Video Streaming: Efficient range-based video streaming for smooth playback from bucket storage
    - Event Timeline: Click markers to jump to specific moments in the match
    - Hover Tooltips: Detailed event information on timeline markers
    - Previous Analyses: Grid view of user's previous match analyses with player names and delete functionality
    - Delete Functionality: Users can delete their own analyses with ownership verification and automatic cleanup of both database records and bucket storage videos
-   **Rank-Up Calculator**: AI-powered rank advancement strategy with the following capabilities:
    - Compact visual progress indicators (7-stage analysis feedback)
    - Saved analyses management (view, delete, recalculate previous analyses)
    - AI transparency: View the complete prompt sent to OpenAI via expandable accordion
    - Calculations typically take 3-5 minutes due to complex analysis of ranking data and competition strategies
    - Results cached for 1 month with automatic expiration

### System Design Choices
-   **Database Choice**: PostgreSQL for data integrity and complex analytics.
-   **AI Integration**: OpenAI GPT-4o for accurate sports analysis.
-   **Component Architecture**: Modular React components with TypeScript for maintainability.
-   **State Management**: TanStack Query for efficient server state caching.
-   **Styling Strategy**: Tailwind CSS + shadcn/ui for consistent, customizable design.
-   **Real-time Features**: WebSocket integration for live analysis.
-   **Session Management**: Replit Key Value Store for zero-configuration session persistence.
-   **Data Structure Refinement**: Consolidated ranking data into `athlete_ranks` and separated coaches into their own table. Removed external image URLs in favor of Replit Object Storage. Refactored competition participation model (October 2025): eliminated redundant `career_events` table in favor of using `competition_participants` as the single source of truth for athlete competition history, with enhanced fields for performance tracking (`points`, `eventResult`).
-   **Performance Optimization**: Database indexes on all foreign key and frequently queried columns for optimal query performance. Rank-up calculations timeout set to 5 minutes to accommodate complex AI analysis. JSON imports use batch processing (20 items per batch) with parallel logo uploads for efficiency. Athlete filter uses lightweight `/api/athletes/simple` endpoint (returns only id, name, nationality) for sub-second load times instead of expensive ranking calculations. Athlete filter dropdown optimized with:
    - Lazy loading (only fetches data when opened)
    - Infinite scroll rendering (initial 20 athletes, loads 20 more on scroll)
    - Egypt/Global filter integration (filters athletes based on header toggle)
    - Profile pictures displayed with controlled loading (20 at a time prevents browser freeze)
    - Real-time server-side search: Searches entire database via API (case-insensitive LIKE query) instead of filtering client-side loaded results; debounced 300ms for performance
-   **Competition Access**: All competitions are always enabled for all users (removed user_competition_preferences system - October 2025).

### Database Schema
-   `athletes`: Athlete profiles, performance metrics, includes `simplyCompeteUserId` for accurate athlete matching (indexed on: worldCategory, nationality, name, simplyCompeteUserId)
-   `kpi_metrics`: Key performance indicators (indexed on: athleteId)
-   `strengths/weaknesses`: Athlete skill assessments (indexed on: athleteId)
-   `training_recommendations`: AI-generated training plans (indexed on: athleteId)
-   `athlete_ranks`: Consolidated ranking system (world, Olympic, national, continental, regional) (indexed on: athleteId, rankingType, category, ranking)
-   `coaches`: Coach information
-   `users`: User profiles with authentication details and bio
-   `competitions`: Competition events with SimplyCompete integration fields (`sourceUrl`, `metadata`, `lastSyncedAt`, `simplyCompeteEventId`, `logo`) - logos stored in Replit Object Storage (indexed on: simplyCompeteEventId)
-   `competition_participants`: Links athletes to competitions with performance data (`points`, `eventResult`, `weightCategory`, `seedNumber`, `subeventName`, `status`) - serves as the single source of truth for athlete competition history and career events (indexed on: competitionId, athleteId)
-   `opponent_analysis_cache`: Stores AI-powered opponent analysis results with monthly expiration.
-   `ai_queries`: AI query history (indexed on: athleteId, timestamp)
-   `training_plans`: Detailed training plans (indexed on: athleteId)
-   `sponsorship_bids`: Sponsorship bids for athletes (indexed on: athleteId, sponsorUserId)
-   `video_analysis`: Video analysis records with stored video paths, match/clip analysis data, and event timelines (indexed on: userId, analysisType)

## External Dependencies

-   **Database**: Neon Database (serverless PostgreSQL)
-   **AI Services**: OpenAI API (GPT-4o model)
-   **UI Frameworks**: Radix UI, Tailwind CSS
-   **Charts**: Recharts
-   **PDF Generation**: jsPDF
-   **Object Storage**: Replit Object Storage
-   **Competition Data**: SimplyCompete API