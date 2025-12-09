-- Pre-seed common Sri Lanka locations for caching to reduce API calls
INSERT INTO cached_locations (place_id, place_name, main_text, coordinates, search_terms)
VALUES 
  ('ChIJbSFfyl4T4joRj8MwS04bzSk', 'Colombo, Sri Lanka', 'Colombo', '{"lat": 6.9271, "lng": 79.8612}', ARRAY['colombo', 'colombo sri lanka', 'colombo city']),
  ('ChIJSXJ36Z4z4joRh5S-9TJ8Q3g', 'Kandy, Sri Lanka', 'Kandy', '{"lat": 7.2906, "lng": 80.6337}', ARRAY['kandy', 'kandy sri lanka', 'kandy city']),
  ('ChIJKdhRRXWL4zoRYm0LRN21zk0', 'Galle, Sri Lanka', 'Galle', '{"lat": 6.0535, "lng": 80.2210}', ARRAY['galle', 'galle sri lanka', 'galle city', 'galle fort']),
  ('ChIJuQ5sMZo_4joREqd3CqZH9gU', 'Jaffna, Sri Lanka', 'Jaffna', '{"lat": 9.6615, "lng": 80.0255}', ARRAY['jaffna', 'jaffna sri lanka', 'jaffna city']),
  ('ChIJJ0Cw4LJX4joRKsJSYTZVqQQ', 'Negombo, Sri Lanka', 'Negombo', '{"lat": 7.2086, "lng": 79.8369}', ARRAY['negombo', 'negombo sri lanka', 'negombo city']),
  ('ChIJY_XzPgVL4joRsOJ2oALn7jQ', 'Matara, Sri Lanka', 'Matara', '{"lat": 5.9485, "lng": 80.5353}', ARRAY['matara', 'matara sri lanka']),
  ('ChIJnVk_6f5D4joRGHFJFqI-L4s', 'Nuwara Eliya, Sri Lanka', 'Nuwara Eliya', '{"lat": 6.9497, "lng": 80.7891}', ARRAY['nuwara eliya', 'nuwaraeliya', 'nuwara eliya sri lanka']),
  ('ChIJsTvYGkAX4joRz22cepL8NqA', 'Anuradhapura, Sri Lanka', 'Anuradhapura', '{"lat": 8.3114, "lng": 80.4037}', ARRAY['anuradhapura', 'anuradhapura sri lanka']),
  ('ChIJI1vC1a0z4joRwRO1VG0lJ_Q', 'Badulla, Sri Lanka', 'Badulla', '{"lat": 6.9934, "lng": 81.0550}', ARRAY['badulla', 'badulla sri lanka']),
  ('ChIJLRqL6i8_4joRdE-7j0gXwcA', 'Chilaw, Sri Lanka', 'Chilaw', '{"lat": 7.5758, "lng": 79.7953}', ARRAY['chilaw', 'chilaw sri lanka']),
  ('ChIJq6qq9T0S4joRVdN2lB0KAVs', 'Moratuwa, Sri Lanka', 'Moratuwa', '{"lat": 6.7801, "lng": 79.8824}', ARRAY['moratuwa', 'moratuwa sri lanka']),
  ('ChIJexj0O1ER4joRaxFH4_hpLWQ', 'Nugegoda, Sri Lanka', 'Nugegoda', '{"lat": 6.8725, "lng": 79.8883}', ARRAY['nugegoda', 'nugegoda sri lanka']),
  ('ChIJGXR8rfcT4joRYqUh2ORKwHI', 'Maharagama, Sri Lanka', 'Maharagama', '{"lat": 6.8485, "lng": 79.9267}', ARRAY['maharagama', 'maharagama sri lanka']),
  ('ChIJ8XWY78YT4joRxYnEKEWfCZw', 'Kaduwela, Sri Lanka', 'Kaduwela', '{"lat": 6.9305, "lng": 79.9837}', ARRAY['kaduwela', 'kaduwela sri lanka']),
  ('ChIJMQGMXpMT4joRaGQk0kOQwDs', 'Battaramulla, Sri Lanka', 'Battaramulla', '{"lat": 6.9001, "lng": 79.9191}', ARRAY['battaramulla', 'battaramulla sri lanka']),
  ('ChIJCzYy5yMl4joRuOT4jq9OQvM', 'Kurunegala, Sri Lanka', 'Kurunegala', '{"lat": 7.4869, "lng": 80.3648}', ARRAY['kurunegala', 'kurunegala sri lanka']),
  ('ChIJ__8eZfsx4joRM56wWCHN5os', 'Trincomalee, Sri Lanka', 'Trincomalee', '{"lat": 8.5874, "lng": 81.2152}', ARRAY['trincomalee', 'trincomalee sri lanka', 'trinco']),
  ('ChIJU_KvYyuE4joRpRSLyQQ9k9k', 'Hambantota, Sri Lanka', 'Hambantota', '{"lat": 6.1241, "lng": 81.1185}', ARRAY['hambantota', 'hambantota sri lanka']),
  ('ChIJ4xXzFVIT4joR4HGqL8wIpjU', 'Dehiwala, Sri Lanka', 'Dehiwala', '{"lat": 6.8567, "lng": 79.8653}', ARRAY['dehiwala', 'dehiwala sri lanka', 'dehiwala-mount lavinia']),
  ('ChIJh-R7W7UT4joRzX-X8vPlYBU', 'Kottawa, Sri Lanka', 'Kottawa', '{"lat": 6.8407, "lng": 79.9646}', ARRAY['kottawa', 'kottawa sri lanka'])
ON CONFLICT (place_id) DO NOTHING;