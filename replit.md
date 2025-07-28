# Wine Cellar Management System

## Overview

This is a full-stack wine cellar management application built with React (frontend), Express.js (backend), and PostgreSQL (database). The system allows users to manage their wine collection with features for adding, searching, and organizing wines in a visual cellar layout.

## User Preferences

Preferred communication style: Simple, everyday language.

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
5. **Storage Layer**: Abstracted data access with in-memory fallback

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