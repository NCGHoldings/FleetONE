-- Create enum types for roles and statuses
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'supervisor', 'driver', 'conductor', 'mechanic', 'staff');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.trip_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE public.fleet_status AS ENUM ('active', 'maintenance', 'idle', 'retired');
CREATE TYPE public.maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.permit_status AS ENUM ('valid', 'expired', 'suspended', 'cancelled');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  nic TEXT,
  license_number TEXT,
  license_expiry DATE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  date_of_birth DATE,
  hire_date DATE,
  avatar_url TEXT,
  status user_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create buses/fleet table
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_no TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  route TEXT,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  status fleet_status DEFAULT 'active',
  last_service_date DATE,
  next_service_date DATE,
  last_service_mileage INTEGER,
  next_service_mileage INTEGER,
  current_mileage INTEGER DEFAULT 0,
  registration_number TEXT,
  engine_number TEXT,
  chassis_number TEXT,
  insurance_expiry DATE,
  revenue_license_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_no TEXT UNIQUE NOT NULL,
  route_name TEXT NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  via_locations TEXT[],
  distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  fare_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_trips table
CREATE TABLE public.daily_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_no TEXT UNIQUE,
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  route_id UUID REFERENCES public.routes(id),
  driver_id UUID REFERENCES public.profiles(id),
  conductor_id UUID REFERENCES public.profiles(id),
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  odometer_start INTEGER,
  odometer_end INTEGER,
  distance_km DECIMAL(10,2),
  income DECIMAL(10,2) DEFAULT 0,
  fuel_cost DECIMAL(10,2) DEFAULT 0,
  fuel_liters DECIMAL(10,2) DEFAULT 0,
  diesel_price_per_liter DECIMAL(10,2),
  other_expenses DECIMAL(10,2) DEFAULT 0,
  other_expenses_details JSONB,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  net_income DECIMAL(10,2) DEFAULT 0,
  km_per_liter DECIMAL(10,2),
  status trip_status DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_no TEXT UNIQUE,
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  start_date DATE,
  completion_date DATE,
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  workshop TEXT,
  supervisor_id UUID REFERENCES public.profiles(id),
  bay_number TEXT,
  priority TEXT DEFAULT 'medium',
  status maintenance_status DEFAULT 'pending',
  next_service_km INTEGER,
  next_service_date DATE,
  parts_used JSONB,
  labor_hours JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_permits table
CREATE TABLE public.route_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_no TEXT UNIQUE NOT NULL,
  route_id UUID REFERENCES public.routes(id),
  bus_id UUID REFERENCES public.buses(id),
  route_name TEXT,
  temporary_route_name TEXT,
  via TEXT,
  route_numbers TEXT[],
  ntc_number TEXT,
  owner_name TEXT NOT NULL,
  owner_address TEXT,
  owner_nic TEXT,
  service_type TEXT,
  seats INTEGER,
  max_fare DECIMAL(10,2),
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  annual_fee DECIMAL(10,2),
  permit_status permit_status DEFAULT 'valid',
  operation_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for file management
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_table TEXT NOT NULL,
  linked_row_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tag TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role) 
  FROM public.user_roles 
  WHERE user_id = _user_id
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only super_admin can manage roles" ON public.user_roles FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- Create RLS policies for buses
CREATE POLICY "All authenticated users can view buses" ON public.buses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage buses" ON public.buses FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Create RLS policies for routes
CREATE POLICY "All authenticated users can view routes" ON public.routes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage routes" ON public.routes FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create RLS policies for daily_trips
CREATE POLICY "All authenticated users can view daily trips" ON public.daily_trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can create daily trips" ON public.daily_trips FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'driver') OR
  public.has_role(auth.uid(), 'conductor')
);
CREATE POLICY "Supervisors can update daily trips" ON public.daily_trips FOR UPDATE USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Create RLS policies for maintenance_records
CREATE POLICY "All authenticated users can view maintenance" ON public.maintenance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supervisors can manage maintenance" ON public.maintenance_records FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'mechanic')
);

-- Create RLS policies for route_permits
CREATE POLICY "All authenticated users can view permits" ON public.route_permits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage permits" ON public.route_permits FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create RLS policies for documents
CREATE POLICY "All authenticated users can view documents" ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can upload documents" ON public.documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (uploaded_by = auth.uid());
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE USING (
  uploaded_by = auth.uid() OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create RLS policies for system_settings
CREATE POLICY "All users can view settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can manage settings" ON public.system_settings FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user (becomes super admin)
  SELECT NOT EXISTS(SELECT 1 FROM auth.users LIMIT 1) INTO is_first_user;
  
  -- Insert profile
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    employee_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    'EMP' || LPAD(EXTRACT(epoch FROM NOW())::TEXT, 10, '0')
  );
  
  -- Assign role
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON public.buses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_trips_updated_at BEFORE UPDATE ON public.daily_trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_route_permits_updated_at BEFORE UPDATE ON public.route_permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES
('diesel_price', '220.00', 'Current diesel price per liter in LKR', 'fuel'),
('currency', 'LKR', 'System currency', 'general'),
('timezone', 'Asia/Colombo', 'System timezone', 'general'),
('profit_margin', '0.20', 'Default profit margin for maintenance (20%)', 'maintenance'),
('shop_hours', '{"weekdays": {"start": "08:00", "end": "17:00"}, "saturday": {"start": "08:00", "end": "13:00"}, "sunday": "closed"}', 'Workshop operating hours', 'maintenance'),
('expense_types', '["Food", "Police", "Phone", "Water", "Parking", "Toll", "Other"]', 'Default expense types for trips', 'trips'),
('notification_thresholds', '{"insurance_expiry": 30, "permit_expiry": 10, "service_due": 7}', 'Days before expiry to send notifications', 'alerts');

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES 
('documents', 'documents', false),
('avatars', 'avatars', true);

-- Create storage policies for documents bucket
CREATE POLICY "Authenticated users can view documents" ON storage.objects 
FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents" ON storage.objects 
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'documents');

CREATE POLICY "Users can update own documents" ON storage.objects 
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'documents');

CREATE POLICY "Admins can delete any document" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'documents' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
  )
);

-- Create storage policies for avatars bucket
CREATE POLICY "Avatars are publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);