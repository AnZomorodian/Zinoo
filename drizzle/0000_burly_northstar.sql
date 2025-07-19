CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(7) NOT NULL,
	"ly_code" varchar(10) NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"bio" text,
	"status" varchar(20) DEFAULT 'online',
	"avatar_color" varchar(7) DEFAULT '#4F46E5',
	"profile_picture" varchar(20) DEFAULT 'default',
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp DEFAULT now(),
	"joined_at" timestamp DEFAULT now(),
	"message_count" serial NOT NULL,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_ly_code_unique" UNIQUE("ly_code"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;