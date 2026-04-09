
-- ============================================
-- BULK UPDATE: Fleet Master Roster from Bus Route Data
-- Updates route_label, trips_per_day, turn times, section, sort_order, remark
-- ============================================

-- SECTION 1: Colombo - Jaffna (10 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Panadura→KKS)', trips_per_day = 1, turn_01_time = '8:30 PM', turn_02_time = '4:55 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 1
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8227');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Panadura→KKS)', trips_per_day = 1, turn_01_time = '8:30 PM', turn_02_time = '5:10 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 2
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8228');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Pt Pedru)', trips_per_day = 1, turn_01_time = '8:00 PM', turn_02_time = '4:30 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 3
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8220');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Pt Pedru)', trips_per_day = 1, turn_01_time = '9:00 PM', turn_02_time = '4:50 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 4
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8223');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Pt Pedru)', trips_per_day = 1, turn_01_time = '9:00 PM', turn_02_time = '4:50 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 5
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8262');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Kareinagar)', trips_per_day = 1, turn_01_time = '7:30 PM', turn_02_time = '3:30 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 6
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8268');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Kareinagar)', trips_per_day = 1, turn_01_time = '7:30 PM', turn_02_time = '3:30 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 7
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8222');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Jaffna)', trips_per_day = 1, turn_01_time = '8:30 PM', turn_02_time = '4:15 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 8
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8247');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna (Soysapura→Jaffna)', trips_per_day = 1, turn_01_time = '8:30 PM', turn_02_time = '4:15 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 9
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8243');

UPDATE fleet_master_roster SET route_label = 'Colombo-Jaffna / Madolsima', trips_per_day = 2, turn_01_time = '8:30 PM', turn_02_time = '4:45 AM', remark = 'Running', section = 'Colombo - Jaffna', sort_order = 10
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8246');

-- SECTION 2: Colombo - Badulla (Highway) (2 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo-Badulla (Highway)', trips_per_day = 2, turn_01_time = '10:15 AM', turn_02_time = '5:15 PM', remark = 'Running', section = 'Colombo - Badulla (Highway)', sort_order = 11
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8241');

UPDATE fleet_master_roster SET route_label = 'Colombo-Badulla (Highway)', trips_per_day = 2, turn_01_time = '10:15 AM', turn_02_time = '5:15 PM', remark = 'Running', section = 'Colombo - Badulla (Highway)', sort_order = 12
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8242');

-- SECTION 3: Colombo - Badulla (99) (1 bus)
UPDATE fleet_master_roster SET route_label = 'Colombo-Badulla (99) ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Badulla (99)', sort_order = 13
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8266');

-- SECTION 4: Passara - Colombo (2 buses)
UPDATE fleet_master_roster SET route_label = 'Passara - Colombo', trips_per_day = 1, turn_01_time = '11:45 PM', turn_02_time = '6:00 AM', remark = 'Running', section = 'Passara - Colombo', sort_order = 14
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8223');

UPDATE fleet_master_roster SET route_label = 'Passara - Colombo', trips_per_day = 1, turn_01_time = '12:15 AM', turn_02_time = '6:30 AM', remark = 'Running', section = 'Passara - Colombo', sort_order = 15
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8222');

-- SECTION 5: Colombo - Panama (2 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo - Panama', trips_per_day = 1, turn_01_time = '10:30 PM', turn_02_time = '3:00 AM', remark = 'Running', section = 'Colombo - Panama', sort_order = 16
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8265');

UPDATE fleet_master_roster SET route_label = 'Colombo - Panama', trips_per_day = 1, turn_01_time = '6:45 PM', turn_02_time = '3:00 AM', remark = 'Running', section = 'Colombo - Panama', sort_order = 17
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8264');

-- SECTION 6: Colombo - Nuwara Eliya (2 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo - Nuwara Eliya', trips_per_day = 1, turn_01_time = '4:00 AM', turn_02_time = '11:50 AM', remark = 'Running', section = 'Colombo - Nuwara Eliya', sort_order = 18
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8245');

UPDATE fleet_master_roster SET route_label = 'Colombo - Nuwara Eliya', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Stopped', section = 'Colombo - Nuwara Eliya', sort_order = 19
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8244');

-- SECTION 7: Colombo - Madolsima (1 bus, NG 8246 already counted above)
UPDATE fleet_master_roster SET route_label = 'Colombo - Madolsima', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Madolsima', sort_order = 20
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8280');

-- SECTION 8: Panadura - Kandy (XL) (6 buses + 1 temp)
UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '4:00 AM', turn_02_time = '12:00 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 21
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8220');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '7:30 AM', turn_02_time = '3:40 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 22
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8224');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '9:50 AM', turn_02_time = '6:00 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 23
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8225');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '8:30 AM', turn_02_time = '4:30 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 24
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8226');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '5:15 AM', turn_02_time = '2:00 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 25
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8229');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (XL)', trips_per_day = 1, turn_01_time = '6:20 AM', turn_02_time = '3:20 PM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 26
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8258');

-- NI 8244 does both Kandy (temp) and Nittambuwa (AC) = 2 trips
UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy (Temp) / Nittambuwa (AC)', trips_per_day = 2, turn_01_time = 'TEMP', turn_02_time = '9:00 AM', remark = 'Running', section = 'Panadura - Kandy (XL)', sort_order = 27
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8244');

-- SECTION 9: Panadura - Kandy (7 buses)
UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '5:35 AM', turn_02_time = '1:40 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 28
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NB 1946');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '6:30 AM', turn_02_time = '3:25 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 29
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NC 4832');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '3:30 AM', turn_02_time = '10:40 AM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 30
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 4883');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '4:50 AM', turn_02_time = '12:30 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 31
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 0251');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '4:30 AM', turn_02_time = '12:00 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 32
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2147');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '9:10 AM', turn_02_time = '5:00 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 33
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 6932');

UPDATE fleet_master_roster SET route_label = 'Panadura-Kandy', trips_per_day = 1, turn_01_time = '8:10 AM', turn_02_time = '4:20 PM', remark = 'Running', section = 'Panadura - Kandy', sort_order = 34
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NC 7632');

-- SECTION 10: Panadura - Nittambuwa (2 buses, NI 8244 counted above)
UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa', trips_per_day = 1, turn_01_time = '6:30 AM', turn_02_time = '5:30 PM', remark = 'Running', section = 'Panadura - Nittambuwa', sort_order = 35
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2200');

UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa', trips_per_day = 1, turn_01_time = '6:00 AM', turn_02_time = '5:00 PM', remark = 'Running', section = 'Panadura - Nittambuwa', sort_order = 36
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2201');

-- SECTION 11: Panadura - Nittambuwa (Highway) (4 buses)
UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa (Highway)', trips_per_day = 1, turn_01_time = '6:30 AM', turn_02_time = '1:45 PM', remark = 'Running', section = 'Panadura - Nittambuwa (Highway)', sort_order = 37
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8260');

UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa (Highway)', trips_per_day = 1, turn_01_time = '6:15 AM', turn_02_time = '12:50 PM', remark = 'Running', section = 'Panadura - Nittambuwa (Highway)', sort_order = 38
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8261');

UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa (Highway)', trips_per_day = 1, turn_01_time = '9:00 AM', turn_02_time = '3:45 PM', remark = 'Running', section = 'Panadura - Nittambuwa (Highway)', sort_order = 39
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 0762');

UPDATE fleet_master_roster SET route_label = 'Panadura-Nittambuwa (Highway)', trips_per_day = 1, turn_01_time = '9:00 AM', turn_02_time = NULL, remark = 'Running', section = 'Panadura - Nittambuwa (Highway)', sort_order = 40
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 0746');

-- SECTION 12: Colombo - Kandy (4 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo-Kandy ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Kandy', sort_order = 41
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NB 7377');

UPDATE fleet_master_roster SET route_label = 'Colombo-Kandy ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Kandy', sort_order = 42
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NB 7414');

UPDATE fleet_master_roster SET route_label = 'Colombo-Kandy ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Kandy', sort_order = 43
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NC 8430');

UPDATE fleet_master_roster SET route_label = 'Colombo-Kandy ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Kandy', sort_order = 44
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NC 8222');

-- SECTION 13: Moratuwa - Nittambuwa (5 buses)
UPDATE fleet_master_roster SET route_label = 'Moratuwa-Nittambuwa', trips_per_day = 1, turn_01_time = '5:30 AM', turn_02_time = '8:15 AM', remark = 'Running', section = 'Moratuwa - Nittambuwa', sort_order = 45
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2511');

UPDATE fleet_master_roster SET route_label = 'Moratuwa-Nittambuwa', trips_per_day = 1, turn_01_time = '10:30 AM', turn_02_time = '3:15 PM', remark = 'Running', section = 'Moratuwa - Nittambuwa', sort_order = 46
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8253');

UPDATE fleet_master_roster SET route_label = 'Moratuwa-Nittambuwa', trips_per_day = 2, turn_01_time = '7:15 AM', turn_02_time = '9:20 AM', remark = 'Running', section = 'Moratuwa - Nittambuwa', sort_order = 47
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8254');

UPDATE fleet_master_roster SET route_label = 'Moratuwa-Nittambuwa', trips_per_day = 1, turn_01_time = '2:00 PM', turn_02_time = '3:40 PM', remark = 'Running', section = 'Moratuwa - Nittambuwa', sort_order = 48
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8255');

UPDATE fleet_master_roster SET route_label = 'Moratuwa-Nittambuwa', trips_per_day = 1, turn_01_time = '4:30 PM', turn_02_time = NULL, remark = 'Running', section = 'Moratuwa - Nittambuwa', sort_order = 49
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8256');

-- SECTION 14: Mirigama - Panadura (1 bus, 2 round trips)
UPDATE fleet_master_roster SET route_label = 'Mirigama-Panadura', trips_per_day = 2, turn_01_time = '5:20 AM', turn_02_time = '12:30 PM', remark = 'Running', section = 'Mirigama - Panadura', sort_order = 50
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8229');

-- SECTION 15: Stopped routes
UPDATE fleet_master_roster SET route_label = 'Meegoda-Pettah (NOT RUNNING)', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Stopped', section = 'Stopped Routes', sort_order = 51
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8255');

UPDATE fleet_master_roster SET route_label = 'Panadura-Pettah (NOT RUNNING)', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Stopped', section = 'Stopped Routes', sort_order = 52
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8257');

-- SECTION 16: Colombo - Trincomalee (1 bus)
UPDATE fleet_master_roster SET route_label = 'Colombo-Trincomalee ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Trincomalee', sort_order = 53
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 1397');

-- SECTION 17: Colombo - Gampola (4 buses)
UPDATE fleet_master_roster SET route_label = 'Colombo-Gampola', trips_per_day = 1, turn_01_time = '5:45 AM', turn_02_time = '10:30 AM', remark = 'Running', section = 'Colombo - Gampola', sort_order = 54
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2143');

UPDATE fleet_master_roster SET route_label = 'Colombo-Gampola', trips_per_day = 1, turn_01_time = '7:10 AM', turn_02_time = '12:30 PM', remark = 'Running', section = 'Colombo - Gampola', sort_order = 55
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 3470');

UPDATE fleet_master_roster SET route_label = 'Colombo-Gampola ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Gampola', sort_order = 56
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 3469');

UPDATE fleet_master_roster SET route_label = 'Colombo-Gampola ROTATION', trips_per_day = 1, turn_01_time = NULL, turn_02_time = NULL, remark = 'Running', section = 'Colombo - Gampola', sort_order = 57
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 0295');

-- SECTION 18: Kegalle - Colombo (1 bus)
UPDATE fleet_master_roster SET route_label = 'Kegalle-Colombo', trips_per_day = 1, turn_01_time = '6:00 PM', turn_02_time = '6:30 AM', remark = 'Running', section = 'Kegalle - Colombo', sort_order = 58
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2149');

-- SECTION 19: Colombo - Horana (1 bus)
UPDATE fleet_master_roster SET route_label = 'Colombo-Horana', trips_per_day = 1, turn_01_time = '6:40 AM', turn_02_time = '2:20 PM', remark = 'Running', section = 'Colombo - Horana', sort_order = 59
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 5265');

-- SECTION 20: Horana - Kaduwela (2 buses)
UPDATE fleet_master_roster SET route_label = 'Horana-Kaduwela', trips_per_day = 2, turn_01_time = '7:00 AM', turn_02_time = '2:00 PM', remark = 'Running', section = 'Horana - Kaduwela', sort_order = 60
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8259');

UPDATE fleet_master_roster SET route_label = 'Horana-Kaduwela', trips_per_day = 2, turn_01_time = '10:30 AM', turn_02_time = '4:40 PM', remark = 'Running', section = 'Horana - Kaduwela', sort_order = 61
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 1184');

-- SECTION 21: Kaduwela - Moratuwa (1 bus, 4 round trips)
UPDATE fleet_master_roster SET route_label = 'Kaduwela-Moratuwa', trips_per_day = 4, turn_01_time = '5:50 AM', turn_02_time = '5:50 PM', remark = 'Running', section = 'Kaduwela - Moratuwa', sort_order = 62
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NG 8256');

-- SECTION 22: Colombo - Anuradhapura (1 bus)
UPDATE fleet_master_roster SET route_label = 'Colombo-Anuradhapura', trips_per_day = 1, turn_01_time = '3:00 PM', turn_02_time = '8:10 AM', remark = 'Running', section = 'Colombo - Anuradhapura', sort_order = 63
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NC 7712');

-- SECTION 23: Kadawatha - Navinna (1 bus, 4 turns)
UPDATE fleet_master_roster SET route_label = 'Kadawatha-Navinna', trips_per_day = 4, turn_01_time = '5:30 AM', turn_02_time = '6:15 AM', remark = 'Running', section = 'Kadawatha - Navinna', sort_order = 64
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2521');

-- SECTION 24: Rathnapura - Colombo (2 buses)
UPDATE fleet_master_roster SET route_label = 'Rathnapura-Colombo', trips_per_day = 1, turn_01_time = '8:00 AM', turn_02_time = '2:00 PM', remark = 'Running', section = 'Rathnapura - Colombo', sort_order = 65
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2150');

UPDATE fleet_master_roster SET route_label = 'Rathnapura-Colombo', trips_per_day = 1, turn_01_time = '8:30 AM', turn_02_time = '3:00 PM', remark = 'Running', section = 'Rathnapura - Colombo', sort_order = 66
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NE 2152');

-- SECTION 25: Avissawella - Colombo (3 buses)
UPDATE fleet_master_roster SET route_label = 'Avissawella-Colombo', trips_per_day = 1, turn_01_time = '6:10 AM', turn_02_time = '10:00 AM', remark = 'Running', section = 'Avissawella - Colombo', sort_order = 67
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8250');

UPDATE fleet_master_roster SET route_label = 'Avissawella-Colombo', trips_per_day = 1, turn_01_time = '6:40 AM', turn_02_time = '10:30 AM', remark = 'Running', section = 'Avissawella - Colombo', sort_order = 68
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'NI 8251');

UPDATE fleet_master_roster SET route_label = 'Avissawella-Colombo', trips_per_day = 1, turn_01_time = '2:00 PM', turn_02_time = '4:30 PM', remark = 'Running', section = 'Avissawella - Colombo', sort_order = 69
WHERE bus_id = (SELECT id FROM buses WHERE bus_no = 'ND 9155');

-- ============================================
-- UPDATE BUS CAPACITY where seat count provided
-- ============================================
UPDATE buses SET capacity = 49 WHERE bus_no IN ('NG 8227','NG 8228','NG 8262','NG 8247','NG 8243','NG 8241','NG 8242','NG 8220','NG 8224','NG 8225','NG 8226','NG 8229');
UPDATE buses SET capacity = 51 WHERE bus_no IN ('NI 8220','NI 8223','NI 8222','NG 8268');
UPDATE buses SET capacity = 27 WHERE bus_no = 'NG 8258';
