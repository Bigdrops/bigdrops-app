-- Check if alarm has a clients table (it should from template)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'entity_bigdrops-main_alarm' 
ORDER BY table_name;
