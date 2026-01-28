-- Migration: Cleanup corrupted names
-- This script removes names containing the Unicode Replacement Character (U+FFFD)
-- which typically appears as  and indicates an encoding failure.

-- 1. Identify and log count (for manual verification in SQL Editor)
-- SELECT count(*) FROM public.names WHERE name LIKE '%\uFFFD%';

-- 2. Delete corrupted names
DELETE FROM public.names 
WHERE name LIKE '%\uFFFD%';

-- 3. Also catch names with literal question marks in diamonds if they were stored that way
DELETE FROM public.names 
WHERE name ~ '[^a-zA-Z0-9\s\-\''\.,\(\)\[\]àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŗŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ]';
