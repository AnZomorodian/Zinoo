# Real-Time Messenger Application

A secure, real-time messaging application built with Node.js, Socket.IO, and PostgreSQL. Features persistent message storage, user authentication, and a modern responsive interface.

## Features

- 🔐 **Secure Authentication**: Email and username-based registration with unique constraints
- 💬 **Real-time Messaging**: Instant message delivery using Socket.IO
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🗄️ **Persistent Storage**: All messages and users stored in PostgreSQL database
- ⚙️ **User Settings**: Customizable profile settings panel
- 🛡️ **Security Features**: Input sanitization, CSP headers, rate limiting
- 🌐 **Multiple Deployment Options**: Replit, local server, or custom hosting

## Quick Start

### Option 1: Run on Replit (Recommended)
1. Fork or import this project to Replit
2. Replit will automatically install dependencies and provision a PostgreSQL database
3. Click "Run" to start the application
4. Access your app at the provided URL

### Option 2: Run Locally
1. **Prerequisites**:
   - Node.js 18+ installed
   - PostgreSQL database running
   - Git installed

2. **Clone and Setup**:
   ```bash
   git clone <your-repo-url>
   cd messenger-app
   npm install
   ```

3. **Database Setup**:
   ```bash
   # Create a PostgreSQL database
   createdb messenger_app
   
   # Set environment variable
   export DATABASE_URL="postgresql://username:password@localhost:5432/messenger_app"
   
   # Push database schema
   npm run db:push
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```
   Access at http://localhost:5000

### Option 3: Network/Server Deployment

#### Docker Deployment
```bash
# Build Docker image
docker build -t messenger-app .

# Run with environment variables
docker run -p 5000:5000 \
  -e DATABASE_URL="your_database_url" \
  -e NODE_ENV="production" \
  messenger-app
```

#### VPS/Cloud Server
1. **Server Requirements**:
   - Ubuntu 20.04+ / CentOS 8+
   - 1GB+ RAM
   - Node.js 18+
   - PostgreSQL 13+

2. **Installation**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Create database user
   sudo -u postgres createuser --interactive
   sudo -u postgres createdb messenger_app
   ```

3. **Deploy Application**:
   ```bash
   # Clone your repository
   git clone <your-repo-url>
   cd messenger-app
   
   # Install dependencies
   npm install --production
   
   # Set environment variables
   export DATABASE_URL="postgresql://user:password@localhost:5432/messenger_app"
   export NODE_ENV="production"
   export PORT="5000"
   
   # Push database schema
   npm run db:push
   
   # Start with PM2 (process manager)
   npm install -g pm2
   pm2 start server.js --name "messenger-app"
   pm2 startup
   pm2 save
   ```

4. **Nginx Reverse Proxy** (Optional):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `SESSION_SECRET` | Session encryption key | Yes (Production) | Auto-generated |

## Available Scripts

```bash
# Start the application
npm start

# Push database schema changes
npm run db:push

# Generate database migrations
npm run db:generate

# View database in Drizzle Studio
npm run db:studio

# Development mode with auto-restart
npm run dev

# Run tests
npm test

# Check for security vulnerabilities
npm audit
```

## Project Structure

```
messenger-app/
├── public/                 # Static client files
│   ├── index.html         # Main HTML page
│   ├── script.js          # Client-side JavaScript
│   └── styles.css         # CSS styles
├── server/                # Server-side code
│   ├── db.js             # Database connection
│   └── storage.js        # Data access layer
├── shared/               # Shared code
│   ├── schema.js         # Database schema (JS)
│   └── schema.ts         # Database schema (TS)
├── scripts/              # Utility scripts
│   └── setup-db.js       # Database setup
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── drizzle.config.ts     # Database configuration
```

## API Endpoints

### HTTP Endpoints
- `GET /` - Serve main application
- `GET /api/health` - Health check endpoint

### Socket.IO Events

#### Client → Server
- `join` - Join chat with username and email
- `send_message` - Send a new message
- `typing` - Indicate typing status
- `update_profile` - Update user profile settings

#### Server → Client
- `message_history` - Send recent messages on join
- `new_message` - Broadcast new message
- `user_joined` - Notify when user joins
- `user_left` - Notify when user leaves
- `users_update` - Send updated user list
- `user_typing` - Typing indicator
- `error` - Error notifications

## Security Features

- **Input Sanitization**: All user inputs are sanitized and validated
- **Content Security Policy**: CSP headers prevent XSS attacks
- **CORS Protection**: Configured for secure cross-origin requests
- **Rate Limiting**: Prevents spam and abuse
- **SQL Injection Prevention**: Using parameterized queries with Drizzle ORM
- **Session Security**: Secure session management
- **Message Length Limits**: Prevents oversized message attacks

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## Troubleshooting

### Common Issues

**Server won't start**:
- Check if `DATABASE_URL` is set correctly
- Verify PostgreSQL is running
- Check if port 5000 is available

**Database connection errors**:
- Verify database credentials
- Check if database exists
- Run `npm run db:push` to create tables

**Socket.IO connection issues**:
- Check firewall settings
- Verify WebSocket support in your environment
- Check CORS configuration for production deployments

### Performance Optimization

- Use Redis for session storage in production
- Implement message pagination for large chat histories
- Add CDN for static assets
- Enable gzip compression
- Use connection pooling for database

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on the GitHub repository or contact the development team.

---

Built with ❤️ using Node.js, Socket.IO, and PostgreSQL