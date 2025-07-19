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

  async createUser(insertUser) {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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