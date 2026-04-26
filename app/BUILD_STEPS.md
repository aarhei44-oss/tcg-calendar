# Build Steps for /app

1. Remove build and cache directories:
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

2. Install dependencies:
   npm install
   npm install prisma@7.4.0 @prisma/client@7.4.0

3. Generate Prisma client:
   npm run prisma:generate

4. Apply Prisma migrations:
   npm run prisma:migrate:deploy

5. Seed the database:
   npm run seed

6. Start the development server:
   npm run dev

# All commands should be run from the /app directory.
