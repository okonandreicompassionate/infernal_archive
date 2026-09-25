# Supabase Database Files

Use these files in the Supabase SQL Editor. All seed and fix migrations in this folder are additive and safe to rerun.

## Choose the right file

| File                               | Use when                                                            | Data behavior                                                                  |
| ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `schema.sql`                       | Brand-new Supabase project or full database setup                   | Creates tables, columns, policies, and indexes. It is the baseline setup file. |
| `game_arena.sql`                   | Enabling Battle Arena tables                                        | Creates the isolated `game` schema and its tables.                             |
| `god-account.sql`                  | Promoting the first account to god role                             | Updates only the specified profile role.                                       |
| `seed_species_bible.sql`           | Adding the 48 species bible records                                 | Inserts missing species and fills only empty fields. Does not touch images.    |
| `seed_black_knight_characters.sql` | Adding the five Black Knight characters and supported relationships | Inserts missing characters and relationships. Does not add images.             |
| `add_simulation_finish_state.sql`  | Fixing the simulator `finish_state` schema error                    | Adds only the missing `finish_state` JSONB column.                             |

## Existing database

For the current project, do not rerun the full setup just to apply a small fix. Paste only the migration you need:

1. `add_simulation_finish_state.sql` for the simulator error.
2. `seed_species_bible.sql` for the species data.
3. `seed_black_knight_characters.sql` for the character data and relationships.
4. `game_arena.sql` only when Battle Arena has not been installed.

Run each file in its own SQL Editor query. A successful migration may report zero inserted rows when the records already exist.

## New Supabase project

For a fresh project, run:

1. `schema.sql`
2. `game_arena.sql` if Battle Arena is needed
3. `seed_species_bible.sql`
4. `seed_black_knight_characters.sql`
5. `add_simulation_finish_state.sql` if the baseline schema predates the simulator finish-state column
6. `god-account.sql` after creating the first Auth user, if needed

## Data safety

These migrations intentionally do not use `DELETE`, `TRUNCATE`, or destructive resets. Existing non-empty values and images are preserved. Do not replace a migration with a reset script when a missing column, record, or relationship can be added safely.

Before applying a new SQL file, check its header to confirm whether it is a full setup file or an additive migration.
