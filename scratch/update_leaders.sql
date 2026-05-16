DO $$
DECLARE
    r RECORD;
    v_leader TEXT;
    v_route_id UUID;
    v_new_route_no TEXT;
    v_start_loc TEXT;
    v_end_loc TEXT;
BEGIN
    FOR r IN SELECT id, route_label, route_id FROM fleet_master_roster WHERE route_label IS NOT NULL LOOP
        v_leader := NULL;
        
        -- Match Niroshan
        IF r.route_label ILIKE '%jaffna%' OR
           r.route_label ILIKE '%badulla%' OR
           r.route_label ILIKE '%passara%' OR
           r.route_label ILIKE '%panama%' OR
           r.route_label ILIKE '%madolsima%' THEN
            v_leader := 'Niroshan';
        END IF;

        -- Match Asanka
        IF r.route_label ILIKE '%panadura%kandy%' OR
           r.route_label ILIKE '%panadura%nittabuwa%' OR
           r.route_label ILIKE '%moratuwa%nittabuwa%' OR
           r.route_label ILIKE '%mirigama%panadura%' OR
           r.route_label ILIKE '%colombo%horana%' OR
           r.route_label ILIKE '%horana%kaduwela%' OR
           r.route_label ILIKE '%kaduwela%moratuwa%' OR
           r.route_label ILIKE '%kadawatha%navinna%' OR
           r.route_label ILIKE '%awissawella%colombo%' OR
           r.route_label ILIKE '%avissawella%colombo%' THEN
            v_leader := 'Asanka';
        END IF;

        -- Match Nayana
        IF r.route_label ILIKE '%colombo%nuwara eliya%' OR
           r.route_label ILIKE '%colombo%kandy%' OR
           r.route_label ILIKE '%colombo%trinco%' OR
           r.route_label ILIKE '%colombo%gampola%' OR
           r.route_label ILIKE '%kegalle%colombo%' OR
           r.route_label ILIKE '%colombo%anuradhapura%' OR
           r.route_label ILIKE '%welimada%colombo%' THEN
            v_leader := 'Nayana';
        END IF;

        -- Match Dedunu
        IF r.route_label ILIKE '%rathnapura%colombo%' OR
           r.route_label ILIKE '%ratnapura%colombo%' THEN
            v_leader := 'Dedunu';
        END IF;

        IF v_leader IS NOT NULL THEN
            -- Find if route already exists
            SELECT id INTO v_route_id FROM routes WHERE route_name ILIKE '%' || r.route_label || '%' OR r.route_label ILIKE '%' || route_name || '%' LIMIT 1;
            
            IF v_route_id IS NULL THEN
                v_new_route_no := 'RTE-' || floor(random() * 10000)::text;
                v_start_loc := split_part(r.route_label, '-', 1);
                v_end_loc := split_part(r.route_label, '-', 2);
                
                IF v_start_loc = '' THEN v_start_loc := 'Unknown'; END IF;
                IF v_end_loc = '' THEN v_end_loc := 'Unknown'; END IF;

                INSERT INTO routes (route_name, route_no, start_location, end_location, distance_km, route_leader, is_active)
                VALUES (r.route_label, v_new_route_no, trim(v_start_loc), trim(v_end_loc), 0, v_leader, true)
                RETURNING id INTO v_route_id;
            ELSE
                UPDATE routes SET route_leader = v_leader WHERE id = v_route_id;
            END IF;

            UPDATE fleet_master_roster SET route_id = v_route_id WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
