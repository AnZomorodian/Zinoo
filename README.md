# LinkLy Messenger

A real-time messaging application built with Node.js, Socket.IO, and PostgreSQL. Features include user authentication, live messaging, profile customization, and direct messaging capabilities.

![LinkLy Logo](attached_assets/LinkLyLogo_1752945189863.png)

## Features

- 🔐 **Secure Authentication** - Custom authentication system with bcrypt encryption
- 💬 **Real-time Messaging** - Instant messaging with Socket.IO WebSocket connections
- 👤 **User Profiles** - Customizable avatars, display names, bios, and status indicators
- 🔍 **User Search** - Find and connect with users using unique User IDs
- 💼 **Direct Messaging** - Private conversations between users
- 🎨 **Customizable UI** - Avatar colors, profile pictures, and status options
- 📊 **Online Status** - Real-time connection status indicators

## Technology Stack

- **Backend**: Node.js + Express.js
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet.js, CORS, bcrypt password hashing
- **Development**: TypeScript schemas, ESM modules

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd linkly-messenger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with your database configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/linkly_db
   PGDATABASE=linkly_db
   PGHOST=localhost
   PGPORT=5432
   PGUSER=your_username
   PGPASSWORD=your_password
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Push database schema
   npx drizzle-kit push
   ```

5. **Start the development server**
   ```bash
   node server.js
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## Local Development Setup

### For Replit Environment

If you're running this in Replit, the following environment variables are automatically configured:
- `DATABASE_URL` - PostgreSQL connection string
- `PGDATABASE`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` - Database credentials

### For Local Development

1. **Install PostgreSQL locally**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS (with Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create a database**
   ```bash
   sudo -u postgres createdb linkly_db
   sudo -u postgres createuser your_username
   sudo -u postgres psql -c "ALTER USER your_username WITH ENCRYPTED PASSWORD 'your_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE linkly_db TO your_username;"
   ```

3. **Configure your .env file** (as shown above)

4. **Run database migrations**
   ```bash
   npx drizzle-kit push
   ```

### Development Scripts

```bash
# Start the server
node server.js

# Push database schema changes
npx drizzle-kit push

# View database schema
npx drizzle-kit introspect

# Check database status (via API)
curl http://localhost:5000/api/health
```

## Project Structure

```
linkly-messenger/
├── server.js                 # Main server file
├── server/
│   ├── db.js                # Database connection
│   └── storage.js           # Database operations
├── shared/
│   └── schema.js            # Database schema (Drizzle)
├── public/
│   ├── index.html          # Main HTML file
│   ├── script.js           # Frontend JavaScript
│   └── styles.css          # CSS styles
├── drizzle.config.ts       # Drizzle configuration
└── README.md               # This file
```

## Database Schema

### Users Table
- `id` - Primary key
- `userId` - Unique user identifier (#123456 format)
- `lyCode` - Unique LY code (LY + 6 chars)
- `username` - Unique username
- `email` - User email
- `displayName` - Display name
- `bio` - User biography
- `status` - Online status (online, away, busy, invisible)
- `avatarColor` - Avatar background color
- `profilePicture` - Profile picture type
- `isOnline` - Current online status
- `lastSeen` - Last activity timestamp
- `joinedAt` - Account creation date

### Messages Table
- `id` - Primary key
- `userId` - Reference to users table
- `message` - Message content
- `timestamp` - Message timestamp

## API Endpoints

- `GET /` - Main application
- `GET /api/health` - Health check and system status

## Socket.IO Events

### Client → Server
- `authenticate` - User login
- `register` - User registration
- `send_message` - Send a message
- `update_profile` - Update user profile
- `search_user` - Search for users
- `typing` - Typing indicator
- `get_users` - Request user list

### Server → Client
- `auth_success` - Successful authentication
- `auth_error` - Authentication error
- `new_message` - New message received
- `message_history` - Message history
- `users_update` - Updated user list
- `profile_updated` - Profile update confirmation
- `user_joined` / `user_left` - User presence changes

## Features in Detail

### User Authentication
- Secure password hashing with bcrypt
- Email and username validation
- Session management with Socket.IO

### Profile Management
- Display name customization
- Bio with 30+ character minimum
- Avatar color selection
- Profile picture options
- Status indicators (Online, Away, Busy, Invisible)

### Messaging System
- Real-time message delivery
- Message history
- Typing indicators
- User presence status

### User Search
- Find users by unique User ID
- Private messaging initiation

## Security Features

- Password hashing with bcrypt (12 rounds)
- CORS protection
- Helmet.js security headers
- Input sanitization and validation
- SQL injection prevention (Drizzle ORM)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PGDATABASE` | Database name | Yes |
| `PGHOST` | Database host | Yes |
| `PGPORT` | Database port | Yes |
| `PGUSER` | Database username | Yes |
| `PGPASSWORD` | Database password | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your PostgreSQL service is running
   - Verify environment variables are correct
   - Ensure database exists and user has permissions

2. **Profile Settings Not Working**
   - Check browser console for JavaScript errors
   - Verify user is logged in
   - Check network connection to server

3. **Users Not Showing Online**
   - Check Socket.IO connection status
   - Verify server is broadcasting user updates
   - Check browser network tab for WebSocket connections

### Development Tips

- Use browser developer tools to debug frontend issues
- Check server console for backend error messages
- Monitor network tab for Socket.IO connection issues
- Use `console.log` for debugging (already implemented)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review browser console and server logs
- Create an issue in the repository

---

Built with ❤️ by DeepInk Team