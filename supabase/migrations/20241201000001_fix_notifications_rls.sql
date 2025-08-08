-- Add RLS policy to allow users to send notifications to their coaches
-- This policy allows users to insert notifications for coaches who are assigned to their programs
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can send notifications to their coaches'
  ) then
    create policy "Users can send notifications to their coaches" on notifications
      for insert with check (
        exists (
          select 1 from programs p
          join users u on p.user_id = u.id
          where p.coach_id = user_id
          and u.id = auth.uid()
        )
      );
  end if;
end $$;

-- Also allow coaches to send notifications to their clients
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Coaches can send notifications to their clients'
  ) then
    create policy "Coaches can send notifications to their clients" on notifications
      for insert with check (
        exists (
          select 1 from programs p
          join users u on p.user_id = u.id
          where p.coach_id = auth.uid()
          and u.id = user_id
        )
      );
  end if;
end $$;