# Overview

This is a WhatsApp bot and lead management system built for Develix Inc, a Nigerian technology company founded by teenage entrepreneurs. The application serves as a comprehensive platform that combines WhatsApp automation with business lead tracking and management capabilities. It features a modern web dashboard for monitoring bot interactions, managing leads, and tracking business metrics in real-time.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack Architecture
The application follows a monorepo structure with clear separation between client and server code. The frontend is built with React and TypeScript, while the backend uses Express.js with Node.js. The architecture supports both development and production environments with proper build configurations.

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: Comprehensive design system using Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with a custom design system featuring CSS variables for theming
- **State Management**: TanStack Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js ESM
- **WhatsApp Integration**: Baileys library for WhatsApp Web API connectivity
- **Bot Logic**: Stateful conversation management with menu systems and lead form handling
- **API Design**: RESTful endpoints with proper error handling and rate limiting
- **Session Management**: In-memory storage with plans for database persistence

## Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL with type-safe database operations
- **Database**: PostgreSQL with Neon serverless database integration
- **Schema Design**: Structured tables for users, WhatsApp sessions, leads, and bot messages
- **Migrations**: Drizzle Kit for database schema management and migrations

## WhatsApp Bot System
- **Connection Management**: Multi-file auth state with automatic reconnection handling
- **Message Processing**: Asynchronous message handling with conversation state tracking
- **Lead Collection**: Multi-step form system for capturing business leads through chat
- **Status Monitoring**: Real-time connection status and health monitoring

## Development Environment
- **Build System**: Vite for frontend with esbuild for backend bundling
- **Development Tools**: Hot reloading, TypeScript checking, and Replit integration
- **Code Organization**: Path aliases for clean imports and modular component structure

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TanStack Query for frontend state management
- **Backend Runtime**: Express.js, Node.js with TypeScript support via tsx
- **Build Tools**: Vite, esbuild, TypeScript compiler

## UI and Styling
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Design System**: shadcn/ui components built on top of Radix UI
- **Styling**: Tailwind CSS with PostCSS for processing
- **Icons**: Lucide React for consistent iconography

## WhatsApp Integration
- **WhatsApp Library**: @whiskeysockets/baileys for WhatsApp Web API
- **QR Code**: qrcode-terminal for pairing code generation
- **Error Handling**: @hapi/boom for structured HTTP errors

## Database and ORM
- **Database**: Neon PostgreSQL serverless database (@neondatabase/serverless)
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Migrations**: Drizzle Kit for schema management and database migrations
- **Session Storage**: connect-pg-simple for PostgreSQL session storage

## Utilities and Helpers
- **Validation**: Zod for runtime type validation and schema definition
- **Utilities**: Class variance authority, clsx, date-fns for various utility functions
- **Development**: Pino for logging, nanoid for ID generation
- **Rate Limiting**: express-rate-limit for API protection