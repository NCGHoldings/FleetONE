-- Add image_url column to yutong_bus_models table for cover photos
ALTER TABLE public.yutong_bus_models 
ADD COLUMN image_url text;

-- Create storage bucket for bus model images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('yutong-bus-models', 'yutong-bus-models', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for bus model images
CREATE POLICY "Bus model images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'yutong-bus-models');

CREATE POLICY "Staff can upload bus model images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'yutong-bus-models' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

CREATE POLICY "Staff can update bus model images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'yutong-bus-models' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));

CREATE POLICY "Staff can delete bus model images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'yutong-bus-models' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)));