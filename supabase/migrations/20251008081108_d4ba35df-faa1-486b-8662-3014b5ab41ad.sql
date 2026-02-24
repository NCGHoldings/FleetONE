-- Create table for bus model images
CREATE TABLE IF NOT EXISTS public.yutong_bus_model_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_model_id UUID NOT NULL REFERENCES public.yutong_bus_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_yutong_bus_model_images_bus_model_id ON public.yutong_bus_model_images(bus_model_id);
CREATE INDEX idx_yutong_bus_model_images_is_primary ON public.yutong_bus_model_images(is_primary);
CREATE INDEX idx_yutong_bus_model_images_display_order ON public.yutong_bus_model_images(display_order);

-- Enable RLS
ALTER TABLE public.yutong_bus_model_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view bus model images"
  ON public.yutong_bus_model_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bus model images"
  ON public.yutong_bus_model_images
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_yutong_bus_model_images_updated_at
  BEFORE UPDATE ON public.yutong_bus_model_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing images from yutong_bus_models table
INSERT INTO public.yutong_bus_model_images (bus_model_id, image_url, display_order, is_primary, created_at)
SELECT 
  id,
  image_url,
  0,
  true,
  created_at
FROM public.yutong_bus_models
WHERE image_url IS NOT NULL AND image_url != '';