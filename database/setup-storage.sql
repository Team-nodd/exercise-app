-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload exercise images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'exercise-images' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow public read access to exercise images
CREATE POLICY "Allow public read access to exercise images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'exercise-images'
);

-- Policy to allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update exercise images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'exercise-images' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete exercise images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'exercise-images' 
  AND auth.role() = 'authenticated'
); 