-- Update known bus models from 'Unknown' to actual model names
UPDATE public.buses SET model = 'Imported Bus' WHERE bus_no = 'NG 8241' AND (model IS NULL OR model = 'Unknown');
UPDATE public.buses SET model = 'Imported Bus' WHERE bus_no = 'NG 8242' AND (model IS NULL OR model = 'Unknown');