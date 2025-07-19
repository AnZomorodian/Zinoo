import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  avatarColor: varchar('avatar_color', { length: 7 }).default('#4F46E5'),
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