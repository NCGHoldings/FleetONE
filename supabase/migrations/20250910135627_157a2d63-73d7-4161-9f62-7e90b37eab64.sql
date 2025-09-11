-- Insert sample data for school bus service
-- Insert sample data for school branches (if they don't exist)
INSERT INTO public.school_branches (branch_name, branch_code, address, contact_phone, manager_name, is_total_branch)
VALUES 
  ('Total Dashboard', 'TOTAL', 'Head Office', '+94777123456', 'Admin User', true),
  ('Colombo Branch', 'COL01', '123 Galle Road, Colombo 03', '+94777111111', 'John Silva', false),
  ('Kandy Branch', 'KAN01', '456 Peradeniya Road, Kandy', '+94777222222', 'Priya Fernando', false),
  ('Galle Branch', 'GAL01', '789 Matara Road, Galle', '+94777333333', 'Sunil Perera', false),
  ('Negombo Branch', 'NEG01', '321 Main Street, Negombo', '+94777444444', 'Kamala Wijeratne', false),
  ('Jaffna Branch', 'JAF01', '654 Hospital Road, Jaffna', '+94777555555', 'Kumar Siva', false),
  ('Matara Branch', 'MAT01', '987 Beach Road, Matara', '+94777666666', 'Nimal Ratne', false)
ON CONFLICT (branch_code) DO NOTHING;

-- Insert sample students for testing (using the first branch ID)
DO $$
DECLARE 
  branch_id_col UUID;
  branch_id_kan UUID;
  branch_id_gal UUID;
BEGIN
  -- Get branch IDs
  SELECT id INTO branch_id_col FROM public.school_branches WHERE branch_code = 'COL01' LIMIT 1;
  SELECT id INTO branch_id_kan FROM public.school_branches WHERE branch_code = 'KAN01' LIMIT 1;
  SELECT id INTO branch_id_gal FROM public.school_branches WHERE branch_code = 'GAL01' LIMIT 1;
  
  -- Insert sample students for Colombo Branch
  IF branch_id_col IS NOT NULL THEN
    INSERT INTO public.school_students (
      branch_id, student_name, admission_no, grade, parent_name, 
      father_contact_no, mother_contact_no, address, email_id, 
      pickup_point, dropoff_point, route, bus_reg_no, 
      service_type, payment_status, payment_amount, monthly_fee
    ) VALUES 
      (branch_id_col, 'John Perera', 'COL001', 'Grade 5', 'Mr. Perera', '+94771111111', '+94772222222', '123 Main St, Colombo', 'perera@email.com', 'Kollupitiya', 'Royal College', 'Route A', 'CAB-1234', 'BothWay', 'paid', 5000, 5000),
      (branch_id_col, 'Mary Silva', 'COL002', 'Grade 7', 'Mrs. Silva', '+94773333333', '+94774444444', '456 Lake Rd, Colombo', 'silva@email.com', 'Bambalapitiya', 'Methodist College', 'Route B', 'CAB-1235', 'OneWay', 'pending', 3500, 3500),
      (branch_id_col, 'David Fernando', 'COL003', 'Grade 10', 'Mr. Fernando', '+94775555555', '+94776666666', '789 Sea St, Colombo', 'fernando@email.com', 'Wellawatta', 'S. Thomas College', 'Route A', 'CAB-1234', 'BothWay', 'overdue', 6000, 6000),
      (branch_id_col, 'Sarah Jayakody', 'COL004', 'Grade 8', 'Mrs. Jayakody', '+94777777777', '+94778888888', '321 Hill Rd, Colombo', 'jayakody@email.com', 'Nugegoda', 'Visakha Vidyalaya', 'Route C', 'CAB-1236', 'BothWay', 'paid', 5500, 5500),
      (branch_id_col, 'Michael Rathnayake', 'COL005', 'Grade 6', 'Mr. Rathnayake', '+94779999999', '+94770000000', '654 Park Ave, Colombo', 'rathnayake@email.com', 'Dehiwala', 'Royal College', 'Route B', 'CAB-1235', 'OneWay', 'pending', 4000, 4000)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Insert sample students for Kandy Branch
  IF branch_id_kan IS NOT NULL THEN
    INSERT INTO public.school_students (
      branch_id, student_name, admission_no, grade, parent_name, 
      father_contact_no, mother_contact_no, address, email_id, 
      pickup_point, dropoff_point, route, bus_reg_no, 
      service_type, payment_status, payment_amount, monthly_fee
    ) VALUES 
      (branch_id_kan, 'Priya Wickramasinghe', 'KAN001', 'Grade 9', 'Dr. Wickramasinghe', '+94711111111', '+94712222222', '123 Temple St, Kandy', 'wickrama@email.com', 'Peradeniya', 'Trinity College', 'Route K1', 'KAN-1001', 'BothWay', 'paid', 4500, 4500),
      (branch_id_kan, 'Nuwan Bandara', 'KAN002', 'Grade 11', 'Mr. Bandara', '+94713333333', '+94714444444', '456 Lake View, Kandy', 'bandara@email.com', 'Gampola', 'Dharmaraja College', 'Route K2', 'KAN-1002', 'OneWay', 'pending', 3800, 3800),
      (branch_id_kan, 'Kavitha Senaratne', 'KAN003', 'Grade 7', 'Mrs. Senaratne', '+94715555555', '+94716666666', '789 Hill Top, Kandy', 'senaratne@email.com', 'Katugastota', 'Girls High School', 'Route K1', 'KAN-1001', 'BothWay', 'overdue', 5200, 5200)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Insert sample students for Galle Branch
  IF branch_id_gal IS NOT NULL THEN
    INSERT INTO public.school_students (
      branch_id, student_name, admission_no, grade, parent_name, 
      father_contact_no, mother_contact_no, address, email_id, 
      pickup_point, dropoff_point, route, bus_reg_no, 
      service_type, payment_status, payment_amount, monthly_fee
    ) VALUES 
      (branch_id_gal, 'Chaminda Rajapakse', 'GAL001', 'Grade 12', 'Mr. Rajapakse', '+94731111111', '+94732222222', '123 Beach Rd, Galle', 'rajapakse@email.com', 'Unawatuna', 'Richmond College', 'Route G1', 'GAL-2001', 'BothWay', 'paid', 4800, 4800),
      (branch_id_gal, 'Thisara Mendis', 'GAL002', 'Grade 4', 'Mrs. Mendis', '+94733333333', '+94734444444', '456 Fort Area, Galle', 'mendis@email.com', 'Hikkaduwa', 'Southlands College', 'Route G2', 'GAL-2002', 'OneWay', 'pending', 3200, 3200)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;