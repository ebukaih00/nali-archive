-- Allow public uploads to vetting_samples bucket for contributor applications
create policy "Give public access to upload vetting samples"
on storage.objects for insert
with check ( bucket_id = 'vetting_samples' );

-- Allow public uploads to pronunciations bucket (likely needed later for contributions)
create policy "Give public access to upload pronunciations"
on storage.objects for insert
with check ( bucket_id = 'pronunciations' );
