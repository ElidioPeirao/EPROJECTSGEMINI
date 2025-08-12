# E-Projects Platform

## Overview

E-Projects is a comprehensive engineering tools platform built with a modern full-stack architecture. The platform provides tiered access to engineering tools, courses, and support systems for engineers across different specializations including mechanical, electrical, textile, informatics, and chemical engineering.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful APIs with proper HTTP status codes
- **File Structure**: Modular route organization with separate API route files

### Database Architecture
- **Primary Database**: PostgreSQL 16
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Connection**: Neon serverless driver for scalable database connections

## Key Components

### Authentication & Authorization
- **Multi-tier Access System**: E-BASIC (free), E-TOOL, E-MASTER (paid tiers)
- **Role-based Access Control**: Admin, E-BASIC, E-TOOL, E-MASTER roles with hierarchical permissions
- **Session Management**: Active session tracking with automatic cleanup
- **Password Security**: Scrypt-based password hashing with salt
- **Password Recovery**: Token-based password reset system

### User Management
- **User Profiles**: Username, email, CPF (Brazilian tax ID) validation
- **Subscription Management**: Stripe integration for payment processing
- **Role Expiry**: Automatic role downgrade when subscriptions expire
- **Promotional Codes**: System for applying promotional upgrades

### Tools System
- **Categorized Tools**: Organized by engineering discipline
- **Access Level Control**: Tools restricted by user tier
- **Multiple Link Types**: External links, internal routes, and custom HTML content
- **Iframe Support**: For embedding external tools
- **CPF Restrictions**: Tool-specific access control by user CPF

### Course System
- **Course Management**: Full CRUD operations for courses
- **Lesson Organization**: Ordered lessons with video content
- **Material Attachments**: Downloadable materials linked to lessons
- **Video Sources**: Support for YouTube and Google Drive videos
- **Access Control**: Course access tied to user subscription levels

### Chat Support System
- **Thread-based Messaging**: Organized conversation threads
- **Admin Interface**: Dedicated admin chat management
- **Real-time Updates**: Periodic refresh for new messages
- **Unread Tracking**: Separate unread counters for users and admins
- **Status Management**: Open/closed thread status

### Payment Integration
- **Stripe Integration**: Secure payment processing
- **Subscription Plans**: E-TOOL (3 months) and E-MASTER (6 months)
- **Customer Management**: Automatic Stripe customer creation
- **Webhooks**: Payment confirmation and subscription management

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database
3. Session created and stored in PostgreSQL
4. Active session tracking for security
5. Role-based access checks on protected routes

### Tool Access Flow
1. User requests tool from dashboard
2. System checks user role and tool access level
3. CPF-based restrictions applied if configured
4. Tool rendered based on link type (external, internal, custom HTML)

### Course Access Flow
1. User navigates to courses section
2. E-MASTER access level verified
3. Course list filtered by user permissions
4. Lesson content delivered with video player
5. Materials made available for download

### Payment Flow
1. User selects subscription plan
2. Stripe checkout session created
3. Payment processed securely
4. Webhook confirms payment
5. User role upgraded with expiry date

## External Dependencies

### Payment Processing
- **Stripe**: Credit card processing, subscription management
- **Webhook Handling**: Automatic subscription updates

### Email Services
- **SendGrid**: Transactional emails for password resets and notifications

### Video Hosting
- **YouTube**: Primary video hosting platform
- **Google Drive**: Alternative video hosting with direct embedding

### Development Tools
- **Replit**: Development environment with automatic deployments
- **Vite Plugins**: Development tooling and error overlays

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with Vite dev server
- **Production**: Express server serving static files
- **Database**: PostgreSQL with environment-based connection strings
- **Environment Variables**: Stripe keys, database URLs, session secrets

### Build Process
1. Vite builds optimized frontend bundle
2. ESBuild compiles TypeScript backend
3. Static files served from Express
4. Database migrations applied automatically

### Deployment Targets
- **Replit Autoscale**: Automatic scaling based on traffic
- **Port Configuration**: External port 80 mapping to internal port 5000
- **Health Checks**: Application startup verification

## Changelog
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.