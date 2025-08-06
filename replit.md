# Wine Cellar Management System

## Overview

This is a full-stack wine cellar management application built with React (frontend), Express.js (backend), and PostgreSQL (database). The system allows users to manage their wine collection with features for adding, searching, and organizing wines in a visual cellar layout.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **August 6, 2025**: Implemented bulk wine import functionality with Excel/CSV file parsing. Created BulkImportTab component with XLSX library integration, template download feature, and comprehensive import validation. Added bulk import backend endpoint with error handling and country lookup. Users can now import multiple wines from spreadsheet files with preview functionality and detailed error reporting. Also fixed browser confirmation dialog replaced with custom DeleteConfirmationModal for better UX consistency.
- **August 6, 2025**: Fixed critical wine creation bug where empty price fields caused database errors. Issue was empty strings being sent instead of null values for numeric fields. Updated AddWineModal to properly transform empty strings to null for price, year, drinking windows, and countryId fields. Wine creation now works reliably with optional price information.
- **August 6, 2025**: Enhanced wine data model with three new fields: Volume (37.5cl, 75cl, 1.5L, 3L dropdown), To Drink From (year), and To Drink Until (year). Updated database schema, forms (Add/Edit), and wine table display to include new wine tracking capabilities. Improved wine table UI with icon-only buttons, tooltips, and standardized button order (view, edit, transfer, delete) for cleaner interface and better mobile experience.
- **August 6, 2025**: Fixed wine edit cache invalidation issue where grid visualization didn't refresh automatically after editing wines. Added comprehensive cache invalidation to all wine operations (EditWineModal, AddWineModal, WineTable delete, TransferWineModal) to ensure sections, wines, and stats queries are invalidated for immediate UI updates.
- **August 6, 2025**: Replaced all hardcoded layer counts (4) with dynamic cellar layout configuration throughout application. Updated LocationGridSelector and CellarVisualization to use actual cellar rowCount. Grid visualization now automatically adapts to user-defined layout settings with proper TypeScript typing.
- **August 6, 2025**: Fixed critical add wine functionality issue. Problem was missing cellarId field validation in form submission. Resolved by adding cellarId to form default values and including hidden input field. Wine addition now works properly with cellar-specific API endpoints and proper form validation.
- **August 6, 2025**: Completed custom cellar layout configuration feature allowing users to define any number of columns (1-26, labeled A-Z) and rows. Updated database schema with columnCount and rowCount fields. Layout changes automatically reinitialize cellar sections. Settings page includes layout configuration UI with warnings about section resets.
- **February 5, 2025**: Successfully completed full migration to multi-user multi-cellar architecture with Replit authentication. All components now support cellar-specific operations with proper user isolation. Authentication flow implemented with session management, user context, and protected routes. Create cellar functionality fully operational with form validation and database integration.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom wine-themed color variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot reload with tsx

### Database Schema
- **wines table**: Core wine data (name, producer, year, type, region, location, price, notes)
- **cellar_columns table**: Physical cellar layout configuration (columns A-F, 4 layers each)
- **Location system**: Grid-based storage (column + layer coordinates)

## Key Components

### Frontend Components
1. **Dashboard**: Overview with statistics and cellar visualization
2. **Wine Management**: Add, edit, delete, and search wines
3. **Cellar Visualization**: Interactive grid showing wine locations
4. **Search & Filtering**: Real-time wine search and type filtering
5. **Statistics Dashboard**: Collection metrics and insights

### Backend Services
1. **Wine API Routes**: CRUD operations for wine management
2. **Search API**: Full-text search across wine fields
3. **Location API**: Retrieve wines by cellar position
4. **Statistics API**: Aggregate data for dashboard metrics
5. **Storage Layer**: PostgreSQL database with Drizzle ORM (migrated from in-memory storage)

### Shared Schema
- **Type-safe contracts**: Shared TypeScript types between frontend and backend
- **Validation schemas**: Zod schemas for runtime validation
- **Database models**: Drizzle schema definitions

## Data Flow

1. **User Input**: Forms validated with React Hook Form + Zod
2. **API Requests**: TanStack Query manages HTTP requests and caching
3. **Backend Processing**: Express routes handle business logic
4. **Database Operations**: Drizzle ORM executes SQL queries
5. **Response Handling**: Type-safe data returned to frontend
6. **UI Updates**: React Query automatically updates UI on data changes

## External Dependencies

### Core Framework Dependencies
- **React ecosystem**: React, React DOM, React Hook Form
- **Backend runtime**: Express.js, Node.js with ESM modules
- **Database**: PostgreSQL via Neon serverless platform
- **Build tools**: Vite, esbuild for production builds

### UI and Styling
- **Component library**: Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Utilities**: clsx, class-variance-authority for conditional styling

### Development Tools
- **TypeScript**: Full-stack type safety
- **Development server**: Vite with HMR and error overlay
- **Database migrations**: Drizzle Kit for schema management
- **Replit integration**: Custom plugins for Replit environment

## Deployment Strategy

### Development Environment
- **Concurrent servers**: Vite dev server + Express API server
- **Hot reload**: File watching with automatic server restart
- **Error handling**: Runtime error modal for development debugging
- **Database**: Environment-based connection via DATABASE_URL

### Production Build
1. **Frontend build**: Vite builds React app to `dist/public`
2. **Backend build**: esbuild bundles Express server to `dist/index.js`
3. **Static serving**: Express serves built frontend assets
4. **Database migrations**: Drizzle push schema changes to production DB

### Environment Configuration
- **Development**: NODE_ENV=development with file watching
- **Production**: NODE_ENV=production with optimized builds
- **Database**: PostgreSQL connection via DATABASE_URL environment variable
- **Session storage**: PostgreSQL-backed sessions for scalability

### Replit-Specific Features
- **Development banner**: Automatic injection for external access
- **Cartographer plugin**: Enhanced debugging in Replit environment
- **Custom error handling**: Replit-optimized error display
- **Asset serving**: Configured for Replit's file system constraints