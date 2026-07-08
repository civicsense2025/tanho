# Tanho Setup Guide

## Database Setup (Supabase)

The tanho repo uses Supabase PostgreSQL for the database (project: `tanho-personal`, ref: `fruosvefvciqogkhwnta`).

### Applying Schema Migrations

The schema is defined in Drizzle ORM in `src/lib/db/schema/`. To apply it to your Supabase database:

1. **Set environment variables** in `.env.local`:
   ```bash
   DATABASE_URL="postgres://postgres.<project_ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full"
   ```

2. **Apply schema** using drizzle-kit:
   ```bash
   npx drizzle-kit push --config=drizzle.config.ts
   ```

This will:
- Read the schema from `src/lib/db/schema/index.ts`
- Detect the PostgreSQL dialect from `drizzle.config.ts`
- Push the schema to your Supabase database
- Handle all table creation, indexes, and relationships automatically

**Important:** Always use `sslmode=verify-full` in the connection string to avoid SSL warnings that can cause drizzle-kit to hang.

### Troubleshooting

If `drizzle-kit push` hangs on "Pulling schema from database...":
- Ensure your connection string includes `sslmode=verify-full`
- Check that your Supabase project is active
- Verify your database credentials are correct

## Development

```bash
npm install
npm run dev
```

## Type Checking

```bash
npm run typecheck
```

## Notes

- The platform uses a custom content type system (`ct_*` tables) for structured content
- Legacy `entries` table is deprecated in favor of the ct_* system
- Guides are now managed via `ct_guides` with extended URL routing support
