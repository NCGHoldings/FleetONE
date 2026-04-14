-- Add contact and default columns to lightvehicle_responsible_persons
ALTER TABLE lightvehicle_responsible_persons 
ADD COLUMN phone TEXT,
ADD COLUMN email TEXT,
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- Add responsible_person_id to lightvehicle_quotations
ALTER TABLE lightvehicle_quotations 
ADD COLUMN responsible_person_id UUID REFERENCES lightvehicle_responsible_persons(id);