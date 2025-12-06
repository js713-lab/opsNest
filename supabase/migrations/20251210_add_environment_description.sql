-- Add description to environments for richer context
alter table if exists environments
  add column if not exists description text;

