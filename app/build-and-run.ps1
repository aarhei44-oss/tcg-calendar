# PowerShell script to automate build steps for /app

# Remove build and cache directories
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

# Install dependencies
npm install
npm install prisma@7.4.0 @prisma/client@7.4.0

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate

# Apply Prisma migrations
echo "Applying Prisma migrations..."
npm run prisma:migrate:deploy

# Seed the database
echo "Seeding the database..."
npm run seed

# Start the development server
echo "Starting development server..."
npm run dev
