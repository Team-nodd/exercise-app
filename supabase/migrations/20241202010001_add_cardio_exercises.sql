-- Create cardio_exercises table to template cardio workouts
create table if not exists public.cardio_exercises (
  id bigserial primary key,
  name text not null,
  intensity_type text null,
  duration_minutes integer null,
  target_tss integer null,
  target_ftp integer null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_cardio_exercises_updated_at on public.cardio_exercises;
create trigger set_cardio_exercises_updated_at
before update on public.cardio_exercises
for each row execute procedure public.set_updated_at();

-- Enable RLS and allow owner visibility (coach) and read for related users if needed later
alter table public.cardio_exercises enable row level security;

-- Policy: creators can do everything
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_exercises' and policyname = 'Creators can manage their cardio templates'
  ) then
    create policy "Creators can manage their cardio templates" on public.cardio_exercises
      for all
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;
end $$;

-- Policy: anyone authenticated can read (optional, relax as needed)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cardio_exercises' and policyname = 'Authenticated can read cardio templates'
  ) then
    create policy "Authenticated can read cardio templates" on public.cardio_exercises
      for select
      to authenticated
      using (true);
  end if;
end $$;

