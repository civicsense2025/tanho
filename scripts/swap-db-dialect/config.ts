export const MODULES_ROOT = "src/modules";

// Fixed Postgres role name policies grant to. Chosen to avoid colliding
// with Supabase's reserved anon/authenticated/authenticator/service_role
// names. See docs/recipes/swap-database-to-postgres.md "Create the app role".
export const OYS_APP_ROLE = "oys_app";
