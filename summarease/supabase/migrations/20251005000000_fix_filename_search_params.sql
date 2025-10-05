-- Fix filename search to use parameterized queries instead of string concatenation
-- This fixes the issue where searching by filename doesn't work properly

DROP FUNCTION IF EXISTS search_files_by_mixed_criteria(UUID, TEXT[], TEXT[], TEXT);

CREATE OR REPLACE FUNCTION search_files_by_mixed_criteria(
  user_uuid UUID,
  tag_names TEXT[] DEFAULT '{}',
  filename_terms TEXT[] DEFAULT '{}',
  tag_search_logic TEXT DEFAULT 'and'
)
RETURNS TABLE (
  file_id UUID,
  title TEXT,
  file_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  folder_name TEXT,
  summary_text TEXT,
  tags JSONB
) AS $$
DECLARE
  has_tag_criteria BOOLEAN := array_length(tag_names, 1) > 0;
  has_filename_criteria BOOLEAN := array_length(filename_terms, 1) > 0;
  lower_tag_names TEXT[];
BEGIN
  -- Convert all tag names to lowercase for comparison
  IF has_tag_criteria THEN
    SELECT array_agg(LOWER(tag_name)) INTO lower_tag_names
    FROM unnest(tag_names) AS tag_name;
  END IF;

  -- Case 1: Only filename search
  IF has_filename_criteria AND NOT has_tag_criteria THEN
    RETURN QUERY
    SELECT 
      f.id as file_id,
      f.title,
      f.file_type,
      f.status,
      f.created_at,
      fo.name as folder_name,
      s.summary_text,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object('name', t.name, 'type', COALESCE(t.type, 'general'))
        ) FILTER (WHERE t.name IS NOT NULL),
        '[]'::jsonb
      ) as tags
    FROM files f
    LEFT JOIN folders fo ON f.folder_id = fo.id
    LEFT JOIN summaries s ON f.id = s.file_id
    LEFT JOIN summary_tags st ON s.id = st.summary_id
    LEFT JOIN tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
      AND f.status = 'completed'
      AND EXISTS (
        SELECT 1
        FROM unnest(filename_terms) AS term
        WHERE f.title ILIKE '%' || term || '%'
      )
    GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
    ORDER BY s.created_at DESC NULLS LAST;

  -- Case 2: Only tag search
  ELSIF has_tag_criteria AND NOT has_filename_criteria THEN
    IF tag_search_logic = 'and' THEN
      RETURN QUERY
      SELECT 
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        jsonb_agg(DISTINCT jsonb_build_object('name', t.name, 'type', COALESCE(t.type, 'general'))) as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      JOIN summaries s ON f.id = s.file_id
      JOIN summary_tags st ON s.id = st.summary_id
      JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = user_uuid
        AND f.status = 'completed'
        AND s.id IN (
          SELECT st2.summary_id
          FROM summary_tags st2
          JOIN tags t2 ON st2.tag_id = t2.id
          WHERE LOWER(t2.name) = ANY(lower_tag_names)
          GROUP BY st2.summary_id
          HAVING COUNT(DISTINCT LOWER(t2.name)) = array_length(lower_tag_names, 1)
        )
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC;
    ELSE
      RETURN QUERY
      SELECT 
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        jsonb_agg(DISTINCT jsonb_build_object('name', t.name, 'type', COALESCE(t.type, 'general'))) as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      JOIN summaries s ON f.id = s.file_id
      JOIN summary_tags st ON s.id = st.summary_id
      JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = user_uuid
        AND f.status = 'completed'
        AND LOWER(t.name) = ANY(lower_tag_names)
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC;
    END IF;

  -- Case 3: Both tag and filename search (OR logic between the two types)
  ELSIF has_tag_criteria AND has_filename_criteria THEN
    IF tag_search_logic = 'and' THEN
      RETURN QUERY
      SELECT DISTINCT
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('name', t.name, 'type', COALESCE(t.type, 'general'))
          ) FILTER (WHERE t.name IS NOT NULL),
          '[]'::jsonb
        ) as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      LEFT JOIN summaries s ON f.id = s.file_id
      LEFT JOIN summary_tags st ON s.id = st.summary_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = user_uuid
        AND f.status = 'completed'
        AND (
          EXISTS (
            SELECT 1
            FROM unnest(filename_terms) AS term
            WHERE f.title ILIKE '%' || term || '%'
          )
          OR
          (s.id IN (
            SELECT st2.summary_id
            FROM summary_tags st2
            JOIN tags t2 ON st2.tag_id = t2.id
            WHERE LOWER(t2.name) = ANY(lower_tag_names)
            GROUP BY st2.summary_id
            HAVING COUNT(DISTINCT LOWER(t2.name)) = array_length(lower_tag_names, 1)
          ))
        )
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC NULLS LAST;
    ELSE
      RETURN QUERY
      SELECT DISTINCT
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('name', t.name, 'type', COALESCE(t.type, 'general'))
          ) FILTER (WHERE t.name IS NOT NULL),
          '[]'::jsonb
        ) as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      LEFT JOIN summaries s ON f.id = s.file_id
      LEFT JOIN summary_tags st ON s.id = st.summary_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = user_uuid
        AND f.status = 'completed'
        AND (
          EXISTS (
            SELECT 1
            FROM unnest(filename_terms) AS term
            WHERE f.title ILIKE '%' || term || '%'
          )
          OR
          (LOWER(t.name) = ANY(lower_tag_names))
        )
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC NULLS LAST;
    END IF;

  -- Case 4: No search criteria (return empty)
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_files_by_mixed_criteria(UUID, TEXT[], TEXT[], TEXT) TO authenticated;
