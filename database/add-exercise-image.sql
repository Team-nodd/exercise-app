-- Add image_url field to exercises table
ALTER TABLE exercises ADD COLUMN image_url TEXT;

-- Add index for better performance when querying by image_url
CREATE INDEX idx_exercises_image_url ON exercises(image_url); 