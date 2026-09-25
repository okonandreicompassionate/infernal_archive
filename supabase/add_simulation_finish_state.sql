-- Add the combat simulator's final-state payload.
-- Additive and safe to rerun. Existing simulation rows are preserved.

alter table public.simulations
  add column if not exists finish_state jsonb;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'simulations'
  and column_name = 'finish_state';