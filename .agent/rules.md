# Guardian Rules for NCG FleetONE

## 1. Database Connection & Context

**CRITICAL RULE: NEVER hardcode or guess the Supabase Project ID.**
You must ALWAYS read the true, environment-specific `VITE_SUPABASE_PROJECT_ID` from the `.env` or `.env.local` file located in the root directory before running any MCP Supabase server queries.

This prevents running SQL analysis or migrations against the wrong database (e.g. `Garage-One` instead of `FleetONE`). 

If the MCP tool returns a permissions error, you must inform the user and construct the SQL script for them to run strictly in their own Supabase SQL Editor dashboard. Do not blindly switch to a different Project ID just because it works.
