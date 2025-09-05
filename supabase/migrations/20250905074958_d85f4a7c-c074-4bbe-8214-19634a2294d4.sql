-- Delete route_permits with Permit No R.P.01 to R.P.40 (case-insensitive, tolerant to spaces)
DELETE FROM public.route_permits
WHERE lower(regexp_replace(permit_no, '\s+', '', 'g')) ~ '^r\.p\.(0?[1-9]|[12][0-9]|3[0-9]|40)$';