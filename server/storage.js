const { users, messages } = require("../shared/schema");
const { db } = require("./db");
const { eq, desc } = require("drizzle-orm");
const bcrypt = require("bcrypt");

// Interface definition (for documentation only)
// IStorage interface defines the contract for storage implementations

class DatabaseStorage {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async checkUserExists(username, email) {
    try {
      const { or } = require("drizzle-orm");
      const existingUsers = await db.select()
        .from(users)
        .where(
          or(eq(users.username, username.toLowerCase()), eq(users.email, email.toLowerCase()))
        );
      
      return {
        usernameExists: existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase()),
        emailExists: existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase()),
        exists: existingUsers.length > 0
      };
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return { usernameExists: false, emailExists: false, exists: false };
    }
  }

  async createUser(insertUser) {
    try {
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(insertUser.password, 12);
      
      // Generate unique User ID and LY Code
      const userId = await this.generateUniqueUserId();
      const lyCode = await this.generateUniqueLyCode();
      
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          userId,
          lyCode,
          password: hashedPassword,
          displayName: insertUser.displayName || insertUser.username,
          avatarColor: insertUser.avatarColor || this.generateRandomColor()
        })
        .returning();
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Re-throw to prevent partial data saves
    }
  }

  async generateUniqueUserId() {
    let userId;
    let exists = true;
    
    while (exists) {
      // Generate #123456 format
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      userId = `#${randomNum}`;
      
      // Check if it exists
      const [existingUser] = await db.select().from(users).where(eq(users.userId, userId));
      exists = !!existingUser;
    }
    
    return userId;
  }

  async generateUniqueLyCode() {
    let lyCode;
    let exists = true;
    
    while (exists) {
      // Generate LY + 6 random characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'LY';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      lyCode = code;
      
      // Check if it exists
      const [existingUser] = await db.select().from(users).where(eq(users.lyCode, lyCode));
      exists = !!existingUser;
    }
    
    return lyCode;
  }

  async findUserByUserId(userId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.userId, userId));
      if (!user) return null;
      
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error finding user by userId:', error);
      return null;
    }
  }

  async authenticateUser(emailOrUsername, password) {
    try {
      const { or } = require("drizzle-orm");
      // Try to find user by email or username (case insensitive)
      const [user] = await db.select().from(users).where(
        or(eq(users.email, emailOrUsername.toLowerCase()), eq(users.username, emailOrUsername.toLowerCase()))
      );
      
      if (!user) {
        return null;
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error in authenticateUser:', error);
      return null;
    }
  }

  async updateUserProfile(id, profileData) {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        lastSeen: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  generateRandomColor() {
    const colors = [
      '#4F46E5', '#7C3AED', '#DC2626', '#EA580C', '#D97706',
      '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0891B2',
      '#0284C7', '#2563EB', '#9333EA', '#C2410C', '#BE123C'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async updateUserOnlineStatus(id, isOnline) {
    await db
      .update(users)
      .set({ isOnline, lastSeen: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserLastSeen(id) {
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, id));
  }

  async getRecentMessages(limit = 50) {
    const result = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    return result.map(row => ({
      ...row.messages,
      user: row.users
    })).reverse(); // Reverse to show oldest first
  }

  async createMessage(insertMessage) {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessageCount() {
    const result = await db.select().from(messages);
    return result.length;
  }

  async getRecentlyActiveUsers(seconds = 30) {
    try {
      const { gte } = require("drizzle-orm");
      const cutoffTime = new Date(Date.now() - seconds * 1000);
      
      const recentUsers = await db.select()
        .from(users)
        .where(gte(users.lastSeen, cutoffTime))
        .orderBy(desc(users.lastSeen));
        
      return recentUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      console.error('Error getting recently active users:', error);
      return [];
    }
  }

  async addProfileHistory(userId, action, details) {
    // For now, return a simple history item
    // In the future, you could create a separate history table
    return {
      timestamp: new Date().toISOString(),
      action,
      details
    };
  }

  async addProfileHistory(userId, action, details = null) {
    const timestamp = new Date();
    // You could implement a separate history table here if needed
    // For now, we'll just return the formatted history item
    return {
      id: Date.now(),
      action,
      details,
      timestamp: timestamp.toISOString(),
      userId
    };
  }
}

const storage = new DatabaseStorage();

module.exports = { storage };