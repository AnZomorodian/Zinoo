# LinkLy Messenger - Project Overview

## Project Description
A real-time messaging application built with Node.js, Socket.IO, and PostgreSQL. Features include user authentication, live messaging, profile customization, and direct messaging capabilities.

## Architecture Overview
- **Backend**: Node.js with Express.js server
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: Vanilla JavaScript with modern CSS
- **Authentication**: Custom authentication system with bcrypt

## Recent Changes
- ✅ **Migration from Replit Agent to Standard Replit Environment** (2025-01-19)
  - Installed all required Node.js dependencies
  - Created and configured PostgreSQL database
  - Applied database schema migrations successfully
  - Fixed JavaScript authentication flow issues
  - Added LinkLy logo to both auth and chat interfaces
  - Updated footer design to be transparent with social media links
  - Fixed profile settings modal functionality

## Current Features
- User registration and authentication
- Real-time messaging with Socket.IO
- User profiles with customizable avatars and statuses
- Profile settings with bio, display name, and avatar customization
- User search functionality
- Direct messaging capabilities
- Connection status indicators

## User Preferences
- Logo: Uses the provided LinkLy logo (blue gradient design)
- Footer: Transparent background with "LinkLy" on left, "DeepInk Team" in center, and social media icons (Telegram, LinkedIn, GitHub) on right
- Branding: Consistent blue gradient theme throughout the application

## Technical Stack
- **Database**: PostgreSQL with tables for users and messages
- **ORM**: Drizzle with TypeScript schema definitions
- **Security**: Helmet.js for security headers, CORS configuration
- **Styling**: Modern CSS with gradients and animations
- **Real-time**: Socket.IO with connection persistence

## Environment Configuration
- Server runs on port 5000
- Database configured with connection pooling
- CORS enabled for development environment
- WebSocket connections for real-time features

## Current Status
- ✅ Project successfully migrated and running
- ✅ All authentication issues resolved
- ✅ Profile settings fully functional
- ✅ Footer updated with new design
- ✅ Logo integrated and sized appropriately
- 🚀 Ready for deployment and further feature development