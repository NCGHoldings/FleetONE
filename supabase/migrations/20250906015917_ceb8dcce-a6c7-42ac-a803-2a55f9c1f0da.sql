
-- 1) Create a private bucket for temporary payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- IMPORTANT: Policies apply to storage.objects; we make them safe and role-aware.

-- 2) Allow authenticated users to upload (insert) into 'payment-proofs'
create policy "Authenticated users can upload proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'payment-proofs');

-- 3) Allow only the uploader OR finance/admin/super_admin to read (select) proofs
create policy "Owners and finance/admin can read proofs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    owner = auth.uid()
    or public.has_role(auth.uid(), 'finance'::app_role)
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 4) Allow only the uploader OR finance/admin/super_admin to delete proofs
create policy "Owners and finance/admin can delete proofs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    owner = auth.uid()
    or public.has_role(auth.uid(), 'finance'::app_role)
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);
