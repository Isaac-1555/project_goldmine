-- Cleanup and normalization script for tags
-- NOTE: This script is safe-by-default: it first shows what changes will be made.
-- After reviewing the preview SELECTs, you can run the UPDATE/DELETE statements.

BEGIN;

-- Helper normalization expression reused across steps
-- Lowercase -> remove quotes/backticks/braces/colons -> remove non [a-z0-9 _-] -> collapse spaces -> trim
-- Inlined where needed below.

-- 1) Preview normalized names for each tag
WITH normalized AS (
  SELECT
    id,
    name AS old_name,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(name), '[\"`{}\[\]:]+', ' ', 'g'),
          '[^a-z0-9 _-]+',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS new_name
  FROM tags
)
SELECT * FROM normalized WHERE old_name <> new_name ORDER BY id;

-- 2) Preview candidates that would be dropped as junk (after normalization)
WITH normalized AS (
  SELECT
    id,
    name AS old_name,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(name), '[\"`{}\[\]:]+', ' ', 'g'),
          '[^a-z0-9 _-]+',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS new_name
  FROM tags
)
SELECT *
FROM normalized
WHERE new_name = ''
   OR length(new_name) < 2
   OR new_name IN ('general','specific','json')
ORDER BY id;

-- 3) Perform normalization (UNCOMMENT to execute)
-- UPDATE tags t
-- SET name = n.new_name
-- FROM (
--   SELECT id,
--     btrim(
--       regexp_replace(
--         regexp_replace(
--           regexp_replace(lower(name), '[\"`{}\[\]:]+', ' ', 'g'),
--           '[^a-z0-9 _-]+',
--           '',
--           'g'
--         ),
--         '\s+',
--         ' ',
--         'g'
--       )
--     ) AS new_name
--   FROM tags
-- ) AS n
-- WHERE t.id = n.id
--   AND t.name <> n.new_name;

-- 4) Remove junk tags (UNCOMMENT to execute after step 3)
-- WITH junk AS (
--   SELECT id FROM tags
--   WHERE name = '' OR length(name) < 2 OR name IN ('general','specific','json')
-- )
-- DELETE FROM summary_tags st WHERE st.tag_id IN (SELECT id FROM junk);
-- DELETE FROM tags t WHERE t.id IN (SELECT id FROM junk);

-- 5) Merge duplicates after normalization: keep the smallest id, remap references
-- (UNCOMMENT to execute after step 3)
-- WITH dups AS (
--   SELECT name, MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
--   FROM tags
--   GROUP BY name
--   HAVING COUNT(*) > 1
-- ), to_remap AS (
--   SELECT d.name, d.keep_id, unnest(d.all_ids) AS old_id
--   FROM dups d
-- )
-- UPDATE summary_tags st
-- SET tag_id = tr.keep_id
-- FROM to_remap tr
-- WHERE st.tag_id = tr.old_id
--   AND tr.old_id <> tr.keep_id;
--
-- -- Delete non-keeper duplicate tag rows
-- DELETE FROM tags t
-- USING (
--   SELECT name, MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
--   FROM tags
--   GROUP BY name
--   HAVING COUNT(*) > 1
-- ) d
-- WHERE t.name = d.name
--   AND t.id <> d.keep_id;

COMMIT;
