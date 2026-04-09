
-- Step 1: Deactivate ALL roster entries first
UPDATE public.fleet_master_roster SET is_active = false;

-- Step 2: Re-activate only the 70 operational buses by matching bus_no
UPDATE public.fleet_master_roster
SET is_active = true
WHERE bus_id IN (
  SELECT id FROM public.buses
  WHERE REPLACE(bus_no, ' ', '') IN (
    'NG8227','NG8228','NI8220','NI8223','NG8262','NG8268','NI8222','NG8247','NG8243','NG8246',
    'NG8241','NG8242','NG8266',
    'NG8265','NG8264','NG8245','NG8244','NG8280',
    'NG8224','NG8225','NG8226','NG8229','NG8258',
    'NI8244',
    'NB1946','NC4832','ND4883','NE0251','NE2147','ND6932','NC7632',
    'NE2200','NE2201',
    'NG8260','NG8261','NE0762','NE0746',
    'NB7377','NB7414','NC8430','NC8222',
    'NE2511','NI8253','NI8254','NI8255','NI8256','NI8229',
    'NG8255','NG8257','ND1397',
    'NE2143','ND3470','ND3469','ND0295',
    'NE2149','ND5265','NG8259','NE1184','NG8256','NC7712',
    'NE2521','NE2150','NE2152','NI8250','NI8251','ND9155'
  )
);

-- Step 3: Mark NOT RUNNING buses with appropriate remark
UPDATE public.fleet_master_roster
SET remark = 'NOT RUNNING'
WHERE bus_id IN (
  SELECT id FROM public.buses
  WHERE REPLACE(bus_no, ' ', '') IN ('NG8244','NG8255','NG8257')
)
AND is_active = true;
