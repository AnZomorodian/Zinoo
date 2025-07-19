const { users, messages } = require("../shared/schema");
const { db } = require("./db");
const { eq, desc } = require("drizzle-orm");

// Interface definition (for documentation only)
// IStorage interface defines the contract for storage implementations

class DatabaseStorage {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async checkUserExists(username, email) {
    const { or } = require("drizzle-orm");
    const existingUsers = await db.select()
      .from(users)
      .where(
        or(eq(users.username, username), eq(users.email, email))
      );
    
    return {
      usernameExists: existingUsers.some(u => u.username === username),
      emailExists: existingUsers.some(u => u.email === email),
      exists: existingUsers.length > 0
    };
  }

  async createUser(insertUser) {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        displayName: insertUser.displayName || insertUser.username,
        avatarColor: insertUser.avatarColor || this.generateRandomColor()
      })
      .returning();
    return user;
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
}

const storage = new DatabaseStorage();

module.exports = { storage };