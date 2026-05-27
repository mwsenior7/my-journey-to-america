-- Change default status from 'approved' to 'pending' so new submissions require review
alter table public.stories alter column status set default 'pending';

-- Allow status updates via the admin API (password validation is enforced in the API route)
create policy "admin_update_stories"
  on public.stories for update
  using (true)
  with check (true);
