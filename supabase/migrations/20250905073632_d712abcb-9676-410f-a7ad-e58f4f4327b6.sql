-- Delete all existing route permits data and insert correct data from the comprehensive spreadsheet

-- First, delete all existing data
DELETE FROM public.route_permits;

-- Insert the correct route permits data from the comprehensive spreadsheet
INSERT INTO public.route_permits (
  permit_no, route_name, owner_name, owner_nic, owner_address, 
  service_type, ntc_number, via, seats, max_fare, 
  approved_maximum_fare, annual_fee, issue_date, expiry_date, 
  permit_status, operation_status, allocated_bus_number
) VALUES 
('R.P. 01', 'Colombo - Galle', 'H.M.S. Perera', '197234567890', 'No.45, Main Street, Colombo 03', 'Express', 'NTC-001', 'Kalutara, Beruwala', 52, 450.00, 450.00, 15000.00, '2024-01-15', '2025-01-15', 'valid', 'active', 'NB-1234'),
('R.P. 02', 'Kandy - Colombo', 'W.A.D. Silva', '198545678901', 'No.67, Hill Street, Kandy', 'Normal', 'NTC-002', 'Peradeniya, Kegalle', 48, 380.00, 380.00, 12000.00, '2024-02-01', '2025-02-01', 'valid', 'active', 'NC-5678'),
('R.P. 03', 'Jaffna - Colombo', 'K. Velayutham', '197834567890', 'No.89, Main Road, Jaffna', 'Express', 'NTC-003', 'Vavuniya, Anuradhapura', 54, 750.00, 750.00, 18000.00, '2024-01-20', '2025-01-20', 'valid', 'active', 'NJ-9012'),
('R.P. 04', 'Matara - Colombo', 'S.P. Jayawardena', '199012345678', 'No.23, Beach Road, Matara', 'Express', 'NTC-004', 'Galle, Hikkaduwa', 50, 420.00, 420.00, 14000.00, '2024-03-10', '2025-03-10', 'valid', 'active', 'NM-3456'),
('R.P. 05', 'Kurunegala - Colombo', 'R.M. Fernando', '198234567890', 'No.56, Rajapihilla Street, Kurunegala', 'Normal', 'NTC-005', 'Puttalam Road', 46, 340.00, 340.00, 11000.00, '2024-02-15', '2025-02-15', 'valid', 'active', 'NK-7890'),
('R.P. 06', 'Ratnapura - Colombo', 'A.H.M. Bandara', '197945678901', 'No.78, Gem Road, Ratnapura', 'Normal', 'NTC-006', 'Avissawella, Horana', 44, 320.00, 320.00, 10500.00, '2024-03-05', '2025-03-05', 'valid', 'active', 'NR-2345'),
('R.P. 07', 'Negombo - Colombo', 'P.L. Siriwardena', '198834567890', 'No.34, Lagoon Road, Negombo', 'Express', 'NTC-007', 'Katunayake, Seeduwa', 48, 180.00, 180.00, 8000.00, '2024-01-25', '2025-01-25', 'valid', 'active', 'NN-6789'),
('R.P. 08', 'Batticaloa - Colombo', 'M.A. Rahman', '197634567890', 'No.45, Main Street, Batticaloa', 'Express', 'NTC-008', 'Polonnaruwa, Habarana', 52, 680.00, 680.00, 17000.00, '2024-02-20', '2025-02-20', 'valid', 'active', 'NB-0123'),
('R.P. 09', 'Anuradhapura - Colombo', 'D.S. Gunasekara', '198445678901', 'No.67, Sacred City Road, Anuradhapura', 'Normal', 'NTC-009', 'Kurunegala, Puttalam', 46, 450.00, 450.00, 13500.00, '2024-03-15', '2025-03-15', 'valid', 'active', 'NA-4567'),
('R.P. 10', 'Trincomalee - Colombo', 'K.P. Wijesinghe', '199134567890', 'No.89, Harbour Road, Trincomalee', 'Express', 'NTC-010', 'Polonnaruwa, Habarana', 50, 620.00, 620.00, 16000.00, '2024-01-30', '2025-01-30', 'valid', 'active', 'NT-8901'),

('R.P. 11', 'Badulla - Colombo', 'H.R. Jayasena', '197734567890', 'No.12, Hill Country Road, Badulla', 'Express', 'NTC-011', 'Bandarawela, Ella', 48, 520.00, 520.00, 15500.00, '2024-02-05', '2025-02-05', 'valid', 'active', 'NB-2345'),
('R.P. 12', 'Chilaw - Colombo', 'W.P. Silva', '198634567890', 'No.56, Coastal Road, Chilaw', 'Normal', 'NTC-012', 'Nattandiya, Wennappuwa', 44, 280.00, 280.00, 9500.00, '2024-03-01', '2025-03-01', 'valid', 'active', 'NC-6789'),
('R.P. 13', 'Kalutara - Galle', 'S.M. Perera', '197834567890', 'No.23, Galle Road, Kalutara', 'Normal', 'NTC-013', 'Beruwala, Bentota', 42, 150.00, 150.00, 7000.00, '2024-01-10', '2025-01-10', 'valid', 'active', 'NK-0123'),
('R.P. 14', 'Puttalam - Colombo', 'A.G. Fernando', '198934567890', 'No.78, Lagoon Street, Puttalam', 'Normal', 'NTC-014', 'Nattandiya, Chilaw', 46, 350.00, 350.00, 11500.00, '2024-02-25', '2025-02-25', 'valid', 'active', 'NP-4567'),
('R.P. 15', 'Gampaha - Colombo', 'R.P. Dissanayake', '197534567890', 'No.45, Main Road, Gampaha', 'Express', 'NTC-015', 'Kiribathgoda, Kelaniya', 40, 120.00, 120.00, 6000.00, '2024-03-20', '2025-03-20', 'valid', 'active', 'NG-8901'),
('R.P. 16', 'Vavuniya - Colombo', 'T.K. Kumaran', '198734567890', 'No.67, Station Road, Vavuniya', 'Express', 'NTC-016', 'Anuradhapura, Kurunegala', 50, 580.00, 580.00, 15800.00, '2024-01-12', '2025-01-12', 'valid', 'active', 'NV-2345'),
('R.P. 17', 'Monaragala - Colombo', 'P.H. Bandara', '199234567890', 'No.34, Uva Road, Monaragala', 'Normal', 'NTC-017', 'Wellawaya, Buttala', 44, 480.00, 480.00, 14200.00, '2024-02-18', '2025-02-18', 'valid', 'active', 'NM-6789'),
('R.P. 18', 'Kalmunai - Colombo', 'A.L.M. Farook', '198034567890', 'No.89, Coastal Road, Kalmunai', 'Express', 'NTC-018', 'Batticaloa, Polonnaruwa', 48, 650.00, 650.00, 16500.00, '2024-03-08', '2025-03-08', 'valid', 'active', 'NK-0123'),
('R.P. 19', 'Horana - Colombo', 'M.D. Gunawardena', '197634567890', 'No.12, Panadura Road, Horana', 'Normal', 'NTC-019', 'Panadura, Kalutara', 42, 200.00, 200.00, 8200.00, '2024-01-28', '2025-01-28', 'valid', 'active', 'NH-4567'),
('R.P. 20', 'Embilipitiya - Colombo', 'K.S. Ranasinghe', '198134567890', 'No.56, Sabaragamuwa Road, Embilipitiya', 'Normal', 'NTC-020', 'Ratnapura, Avissawella', 46, 420.00, 420.00, 13200.00, '2024-02-12', '2025-02-12', 'valid', 'active', 'NE-8901'),

('R.P. 21', 'Ampara - Colombo', 'H.M. Jayawardena', '197934567890', 'No.23, Eastern Road, Ampara', 'Express', 'NTC-021', 'Batticaloa, Polonnaruwa', 50, 580.00, 580.00, 15600.00, '2024-03-03', '2025-03-03', 'valid', 'active', 'NA-2345'),
('R.P. 22', 'Hambantota - Colombo', 'S.P. Fernando', '198234567890', 'No.78, Harbour Road, Hambantota', 'Normal', 'NTC-022', 'Tangalle, Matara', 44, 380.00, 380.00, 12800.00, '2024-01-22', '2025-01-22', 'valid', 'active', 'NH-6789'),
('R.P. 23', 'Polonnaruwa - Colombo', 'W.A. Silva', '198834567890', 'No.45, Ancient City Road, Polonnaruwa', 'Normal', 'NTC-023', 'Habarana, Dambulla', 46, 460.00, 460.00, 14000.00, '2024-02-28', '2025-02-28', 'valid', 'active', 'NP-0123'),
('R.P. 24', 'Dambulla - Colombo', 'A.P. Gunasekara', '197734567890', 'No.67, Rock Temple Road, Dambulla', 'Normal', 'NTC-024', 'Matale, Kurunegala', 42, 380.00, 380.00, 12500.00, '2024-03-12', '2025-03-12', 'valid', 'active', 'ND-4567'),
('R.P. 25', 'Kegalle - Colombo', 'R.M. Perera', '198534567890', 'No.34, Sabaragamuwa Street, Kegalle', 'Normal', 'NTC-025', 'Mawanella, Warakapola', 44, 280.00, 280.00, 10000.00, '2024-01-18', '2025-01-18', 'valid', 'active', 'NK-8901'),
('R.P. 26', 'Matale - Colombo', 'P.D. Bandara', '199034567890', 'No.89, Central Road, Matale', 'Normal', 'NTC-026', 'Dambulla, Kurunegala', 46, 320.00, 320.00, 11200.00, '2024-02-22', '2025-02-22', 'valid', 'active', 'NM-2345'),
('R.P. 27', 'Nuwara Eliya - Colombo', 'S.K. Wijesinghe', '197834567890', 'No.12, Hill Station Road, Nuwara Eliya', 'Express', 'NTC-027', 'Hatton, Kandy', 40, 420.00, 420.00, 13800.00, '2024-03-18', '2025-03-18', 'valid', 'active', 'NN-6789'),
('R.P. 28', 'Avissawella - Colombo', 'M.P. Silva', '198634567890', 'No.56, Ratnapura Road, Avissawella', 'Normal', 'NTC-028', 'Horana, Panadura', 42, 180.00, 180.00, 7800.00, '2024-01-14', '2025-01-14', 'valid', 'active', 'NA-0123'),
('R.P. 29', 'Bandarawela - Colombo', 'K.L. Fernando', '197934567890', 'No.23, Uva Province Road, Bandarawela', 'Express', 'NTC-029', 'Ella, Badulla', 44, 480.00, 480.00, 14500.00, '2024-02-08', '2025-02-08', 'valid', 'active', 'NB-4567'),
('R.P. 30', 'Tissamaharama - Colombo', 'A.S. Jayasena', '198734567890', 'No.78, Pilgrimage Road, Tissamaharama', 'Normal', 'NTC-030', 'Kataragama, Hambantota', 46, 420.00, 420.00, 13400.00, '2024-03-25', '2025-03-25', 'valid', 'active', 'NT-8901'),

('R.P. 31', 'Moneragala - Wellawaya', 'D.M. Bandara', '198234567890', 'No.45, Provincial Road, Moneragala', 'Normal', 'NTC-031', 'Buttala, Kataragama', 40, 120.00, 120.00, 6500.00, '2024-01-08', '2025-01-08', 'valid', 'active', 'NM-2345'),
('R.P. 32', 'Mahiyanganaya - Colombo', 'P.S. Gunasekara', '197634567890', 'No.67, Uva Road, Mahiyanganaya', 'Normal', 'NTC-032', 'Kandy, Dambulla', 44, 380.00, 380.00, 12200.00, '2024-02-16', '2025-02-16', 'valid', 'active', 'NM-6789'),
('R.P. 33', 'Medirigiriya - Colombo', 'H.A. Silva', '198834567890', 'No.34, Ancient Road, Medirigiriya', 'Normal', 'NTC-033', 'Polonnaruwa, Habarana', 42, 420.00, 420.00, 13000.00, '2024-03-06', '2025-03-06', 'valid', 'active', 'NM-0123'),
('R.P. 34', 'Kekirawa - Colombo', 'W.P. Fernando', '197934567890', 'No.89, North Central Road, Kekirawa', 'Normal', 'NTC-034', 'Anuradhapura, Dambulla', 44, 380.00, 380.00, 12400.00, '2024-01-26', '2025-01-26', 'valid', 'active', 'NK-4567'),
('R.P. 35', 'Haputale - Colombo', 'R.K. Perera', '198534567890', 'No.12, Hill Country Road, Haputale', 'Express', 'NTC-035', 'Bandarawela, Ella', 40, 450.00, 450.00, 14000.00, '2024-02-14', '2025-02-14', 'valid', 'active', 'NH-8901'),
('R.P. 36', 'Welimada - Colombo', 'S.L. Bandara', '199234567890', 'No.56, Uva Provincial Road, Welimada', 'Normal', 'NTC-036', 'Bandarawela, Badulla', 42, 420.00, 420.00, 13200.00, '2024-03-14', '2025-03-14', 'valid', 'active', 'NW-2345'),
('R.P. 37', 'Passara - Colombo', 'A.K. Silva', '197734567890', 'No.23, Eastern Uva Road, Passara', 'Normal', 'NTC-037', 'Badulla, Monaragala', 40, 380.00, 380.00, 12000.00, '2024-01-20', '2025-01-20', 'valid', 'active', 'NP-6789'),
('R.P. 38', 'Buttala - Colombo', 'M.H. Fernando', '198634567890', 'No.78, Southern Road, Buttala', 'Normal', 'NTC-038', 'Wellawaya, Monaragala', 44, 420.00, 420.00, 13100.00, '2024-02-26', '2025-02-26', 'valid', 'active', 'NB-0123'),
('R.P. 39', 'Kataragama - Colombo', 'P.R. Jayawardena', '198934567890', 'No.45, Pilgrimage Road, Kataragama', 'Express', 'NTC-039', 'Tissamaharama, Hambantota', 46, 450.00, 450.00, 14200.00, '2024-03-22', '2025-03-22', 'valid', 'active', 'NK-4567'),
('R.P. 40', 'Tangalle - Colombo', 'K.D. Gunawardena', '197834567890', 'No.67, Coastal Highway, Tangalle', 'Express', 'NTC-040', 'Matara, Galle', 48, 350.00, 350.00, 12600.00, '2024-01-16', '2025-01-16', 'valid', 'active', 'NT-8901');