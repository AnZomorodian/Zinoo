const { execSync } = require('child_process');
const fs = require('fs');

// Create drizzle config if it doesn't exist
const drizzleConfig = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});`;

if (!fs.existsSync('drizzle.config.ts')) {
  fs.writeFileSync('drizzle.config.ts', drizzleConfig);
  console.log('Created drizzle.config.ts');
}

try {
  console.log('Pushing database schema...');
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  console.log('Database schema pushed successfully!');
} catch (error) {
  console.error('Error pushing database schema:', error.message);
  process.exit(1);
}