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
-   **Authentication**: Multi-provider authentication (Google, Microsoft, email/password) with Replit auth fallback.
-   **Object Storage**: Replit Object Storage for athlete profile pictures and other assets; Local file system storage for uploaded video files.

### Feature Specifications
-   **Dashboard System**: Athlete 360° overview, performance analytics, KPI tracking, strengths/weaknesses analysis.
-   **AI-Powered Features**: Opponent analysis, personalized training planner, injury prevention, live match analysis, performance insights.
-   **Athlete Management**: Comprehensive directory with search, filter, sort, edit, and delete functionalities.
-   **Competition Sync**: Background script for syncing competition data from SimplyCompete API with intelligent matching.
-   **Video Analysis System**: AI-powered Taekwondo match analysis with interactive video playback:
    - Match Analysis: Full match breakdown with scoring, techniques, and tactical insights
    - Clip Analysis: Custom coaching advice for specific techniques
    - Interactive Video Player: Timeline markers for kicks, scores, punches, and violations
    - Side-by-side Stats Display: Real-time visualization of player scores, kicks, and warnings
    - Video Streaming: Efficient range-based video streaming for smooth playback
    - Event Timeline: Click markers to jump to specific moments in the match
    - Hover Tooltips: Detailed event information on timeline markers
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
-   **Data Structure Refinement**: Consolidated ranking data into `athlete_ranks` and separated coaches into their own table. Removed external image URLs in favor of Replit Object Storage.
-   **Performance Optimization**: Database indexes on all foreign key and frequently queried columns for optimal query performance. Rank-up calculations timeout set to 5 minutes to accommodate complex AI analysis.

### Database Schema
-   `athletes`: Athlete profiles, performance metrics (indexed on: worldCategory, nationality, name)
-   `kpi_metrics`: Key performance indicators (indexed on: athleteId)
-   `strengths/weaknesses`: Athlete skill assessments (indexed on: athleteId)
-   `opponents`: Opponent data
-   `performance_data`: Historical performance
-   `career_events`: Achievements and milestones (indexed on: athleteId, date)
-   `training_recommendations`: AI-generated training plans (indexed on: athleteId)
-   `athlete_ranks`: Consolidated ranking system (world, Olympic, national, continental, regional) (indexed on: athleteId, rankingType, category, ranking)
-   `coaches`: Coach information
-   `users`: User profiles with authentication details and bio
-   `competitions`: Competition events with SimplyCompete integration fields (`sourceUrl`, `metadata`, `lastSyncedAt`, `simplyCompeteEventId`) (indexed on: simplyCompeteEventId)
-   `competition_participants`: Links athletes to competitions (indexed on: competitionId, athleteId)
-   `opponent_analysis_cache`: Stores AI-powered opponent analysis results with monthly expiration.
-   `performance_analysis_cache`: Stores AI-powered performance analysis results with 30-day expiration.
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