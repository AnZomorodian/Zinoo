import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 7 }).notNull().unique(), // #123456 format
  lyCode: varchar('ly_code', { length: 10 }).notNull().unique(), // Unique LY code
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  status: varchar('status', { length: 20 }).default('online'),
  avatarColor: varchar('avatar_color', { length: 7 }).default('#4F46E5'),
  profilePicture: varchar('profile_picture', { length: 20 }).default('default'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  joinedAt: timestamp('joined_at').defaultNow(),
  messageCount: serial('message_count'),
});

// Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));