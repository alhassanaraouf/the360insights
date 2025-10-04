# Performs Insights - Sports Analytics Dashboard

## Overview
Performs Insights is a comprehensive sports analytics platform designed for Taekwondo athletes. It provides AI-powered performance insights, opponent analysis, training planning, and injury prevention capabilities. The platform aims to be a full-stack web application, offering a 360-degree view of athlete performance, strategic insights, and personalized recommendations. Its business vision includes enhancing athlete performance, optimizing training, and minimizing injury risks within the Taekwondo community, with potential for broader sports applications.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library, Radix UI primitives
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL (Neon serverless) with persistent data storage
- **Database ORM**: Drizzle ORM with Neon driver for WebSocket connections
- **AI Integration**: OpenAI API
- **Session Management**: Replit Key Value Store (custom session store)
- **WebSocket**: Real-time match analysis

### Database Schema (PostgreSQL)
- `athletes`: Athlete profiles, performance metrics
- `kpi_metrics`: Key performance indicators
- `strengths/weaknesses`: Athlete skill assessments
- `opponents`: Opponent data (now integrated into athlete data)
- `performance_data`: Historical performance (now integrated into `athlete_ranks`)
- `career_events`: Achievements and milestones
- `training_recommendations`: AI-generated training plans
- `athlete_ranks`: Consolidated ranking system for world, Olympic, national, continental, regional ranks
- `coaches`: Separate table for coach information
- `users`: User profiles with authentication details and bio
- `competitions`: Competition events with SimplyCompete integration fields (sourceUrl, metadata, lastSyncedAt, simplyCompeteEventId)

### Key Components & Features
- **Dashboard System**: Athlete 360° overview, performance analytics, KPI tracking, strengths/weaknesses analysis.
- **AI-Powered Features**: Opponent analysis, personalized training planner, injury prevention, live match analysis, performance insights (using GPT-4o).
- **Data Management**: Data scraper, PDF report generation, multi-language support (English, Arabic), competition sync with SimplyCompete API.
- **Athlete Management**: Comprehensive athlete directory with search, filter, sort, edit, and delete functionalities.
- **Authentication**: Multi-provider authentication (Google, Microsoft, email/password) with Replit auth fallback.
- **Competition Sync**: Background script for syncing competition data from SimplyCompete API with intelligent matching.

### Recent Changes (October 4, 2025)

- **Auto-Generate Playing Styles on Opponent Selection**: Implemented automatic playing style generation when selecting opponents
  - Created new endpoint `/api/generate/playing-style/:athleteId` for single athlete playing style generation
  - Updated opponent selection handler to detect missing playing styles and auto-generate them using OpenAI GPT-5
  - System checks for empty, null, or whitespace-only playing styles and generates concise labels (e.g., "Aggressive Counter-Puncher")
  - Auto-generated playing styles are saved to database for future use
  - Query cache is invalidated to ensure UI reflects newly generated playing styles
  
- **Opponent Profile Picture Display**: Enhanced Opponent Profile section with athlete profile pictures
  - Added large circular avatar (24x24) displaying opponent's profile picture
  - Integrated with Replit Object Storage for profile images
  - Fallback to user icon when profile picture is unavailable
  - Centered display above opponent name and details

- **Fixed OpenAI API Compatibility**: Resolved GPT-5 parameter error
  - Changed `max_tokens` to `max_completion_tokens` in playing style generation
  - Fixes "Unsupported parameter" error from OpenAI API
  - Ensures proper AI-powered playing style generation

### Previous Changes (October 3, 2025)

- **Fixed Object Storage Bucket Initialization**: Resolved issue where profile pictures were uploaded to production bucket during dev imports
  - Root cause: Client was initialized with `new Client()` without passing bucketId parameter, defaulting to production bucket
  - Fix: Changed initialization to `new Client({ bucketId })` to explicitly specify the target bucket
  - Added enhanced logging to show bucket ID during each upload operation
  - Removed unnecessary `init()` call and `isInitialized` checks since the client is now properly configured at instantiation
  - Dev imports now correctly use dev bucket: `replit-objstore-de6c58a6-b4f1-4ccd-8165-11037524c945`
  - Production uploads use prod bucket: `replit-objstore-63b87864-7da4-4fc4-94df-fe5bd8d4c39b`

### Previous Changes (October 2, 2025)

- **Environment-Based Object Storage Configuration**: Implemented dynamic bucket selection based on environment
  - Bucket selection: Uses `BUCKET_ID` env var if set, otherwise `NODE_ENV` determines bucket (production → prod bucket, otherwise → dev bucket)
  - Updated `server/bucket-storage.ts` to initialize client with environment-based bucket ID
  - Added console logging to show which bucket is being used on startup

### Previous Changes (October 1, 2025)

- **Migration to Standard Replit Environment**: Successfully migrated from Replit Agent to standard Replit environment
  - Refactored OpenAI client initialization to use centralized lazy-loading pattern (getOpenAIClient())
  - Updated all AI-related modules to gracefully handle missing OpenAI API key
  - Application can now start and run without OpenAI API key configured (AI features disabled until key is added)
  - All TypeScript files updated to use shared OpenAI client helper (server/openai-client.ts)
  - Fixed module-level initialization issues that previously caused startup failures
  - Database migrations successfully applied to PostgreSQL
  - All workflows configured and running properly

### Previous Changes (September 30, 2025)

- **SimplyCompete Competition Sync**: Implemented external API integration for competition data synchronization
  - Added database fields to competitions table: `sourceUrl`, `metadata`, `lastSyncedAt`, `simplyCompeteEventId` with index
  - Created background sync script (`scripts/sync-competitions.ts`) that fetches competitions from SimplyCompete API
  - Implemented intelligent matching logic using normalized name comparison and exact date matching
  - Added support for multiple authentication methods: API keys, auth tokens, and session cookies
  - Script includes pagination support, fail-fast error handling, and comprehensive logging
  - Run with: `tsx scripts/sync-competitions.ts` (requires authentication credentials)
  - Authentication: Set `SIMPLYCOMPETE_API_KEY`, `SIMPLYCOMPETE_AUTH_TOKEN`, or `SIMPLYCOMPETE_COOKIE` environment variables

### Previous Changes (September 2, 2025)

- **Competition Display Enhancement**: Modified dashboard competition filtering to show only user-selected competitions
  - Updated CompetitionCalendar component to display empty list when no competitions are selected
  - Removed fallback behavior that showed all competitions by default
  - Users now see only their specifically chosen competitions in dashboard upcoming/recent sections
  - Enforces intentional competition selection for personalized dashboard experience

- **PDF Generation Fixes**: Successfully resolved PDF export functionality issues
  - Fixed TypeScript compilation errors in PDF generator that were causing export failures
  - Removed "AI PERFORMANCE ANALYSIS" main header as requested
  - Updated all section headers to use consistent blue color scheme instead of mixed colors
  - Removed emoji symbols (🗲, 🎯) from section headers for cleaner appearance
  - Verified PDF generation working for both athlete reports and rankings overview
  - All PDF exports now complete successfully with proper formatting

### Previous Changes (August 26, 2025)

- **Deployment Configuration Fixes**: Successfully resolved Replit deployment errors
  - Fixed deployment path issue where system was looking for index.js in root instead of dist directory
  - Created production entry point wrapper (index.js) that properly redirects to built application in dist/
  - Updated ESBuild configuration with `packages: 'external'` to prevent bundling issues with Node.js modules
  - Removed conflicting ESM banner that was causing duplicate declaration errors
  - Verified production build process and application startup functionality
  - All deployment fixes tested and working, ready for production deployment

### Previous Changes (August 19, 2025)

- **PostgreSQL Database Integration**: Successfully integrated Neon PostgreSQL database to replace in-memory storage
  - Created database connection using Drizzle ORM with Neon serverless driver  
  - Updated storage layer (DatabaseStorage) to use database operations instead of memory
  - All existing schema tables (athletes, kpi_metrics, career_events, etc.) now persist to PostgreSQL
  - Database credentials and connection automatically configured through Replit environment
- **Authentication Database Setup**: Configured database-backed authentication system
  - Added users table with proper UUID generation and user profile fields
  - Added sessions table with PostgreSQL session store for persistent authentication
  - Updated Replit Auth to use database instead of in-memory session storage
  - All authentication data now persists between application restarts

- **Bug Fixes**: Fixed critical database connection issue (DATABASE_URL was missing), resolved TypeScript type errors in storage functions, fixed authentication session persistence in development environment, created user authentication table and sample data
- **Enhanced JSON Import**: Added support for new JSON format with athletes wrapped in "athletes" array and competition history processing
- **Career Journey Updates**: Added event_result field display in career timeline views, showing competition results like "Gold Medal", "Bronze Medal", etc.
- **Athlete Filtering**: Updated athlete selectors to respect Egypt/Global toggle - shows only Egyptian athletes when Egypt mode is active
- **Removed Pages**: Removed Injury Prevention page (`/injury-prevention`) and Tactical Training page (`/tactical-training`), cleaned up navigation and routing  
- **Athlete360 Updates**: Removed injury history section from athlete360 page, expanded career journey to full width layout
- **Training Planner Fix**: Fixed backend error by replacing missing performance data function with career events data

### Previous Changes (August 12, 2025)
- **Removed Pages**: Motivation Hub Page (`/motivation-dashboard`), World Ranking Page (`/rankings`), and Data Verification Page (`/data-verification`) as requested by user
- **Updated Navigation**: Removed corresponding navigation items from sidebar
- **Backend Preserved**: Data verification API endpoints remain available for other features that may need data validation functionality

### Data Flow
Authentication & athlete selection -> Data aggregation -> AI processing (OpenAI API) -> Real-time updates (WebSockets) -> Export & sharing (PDF).

### Key Architectural Decisions
1.  **Database Choice**: PostgreSQL for relational data integrity and complex analytics.
2.  **AI Integration**: OpenAI GPT-4o for accurate sports analysis.
3.  **Component Architecture**: Modular React components with TypeScript for maintainability.
4.  **State Management**: TanStack Query for efficient server state caching.
5.  **Styling Strategy**: Tailwind CSS + shadcn/ui for consistent, customizable design.
6.  **Real-time Features**: WebSocket integration for live analysis.
7.  **Session Management**: Replit Key Value Store for zero-configuration session persistence.
8.  **Data Structure Refinement**: Consolidated ranking data into `athlete_ranks` and separated coaches into their own table for normalization. Removed external image URLs in favor of Replit Object Storage.

## External Dependencies

### Core Dependencies
-   **Database**: Neon Database (serverless PostgreSQL)
-   **AI Services**: OpenAI API (GPT-4o model)
-   **UI Frameworks**: Radix UI, Tailwind CSS
-   **Charts**: Recharts
-   **PDF Generation**: jsPDF
-   **Object Storage**: Replit Object Storage

### Development Tools
-   **TypeScript**: For type safety
-   **Drizzle Kit**: Database migrations
-   **ESBuild**: Backend bundling
-   **PostCSS**: CSS processing