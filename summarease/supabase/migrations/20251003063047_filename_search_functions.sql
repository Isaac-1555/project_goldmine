-- Function to get filename/title suggestions with usage count
CREATE OR REPLACE FUNCTION get_filename_suggestions(search_term TEXT)
RETURNS TABLE (
  name TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.title as name,
    COUNT(f.id) as usage_count
  FROM files f
  WHERE f.title ILIKE '%' || search_term || '%'
    AND f.status = 'completed'
  GROUP BY f.title
  ORDER BY usage_count DESC, f.title ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search files by mixed criteria (tags and/or filenames)
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
  tags TEXT[]
) AS $$
DECLARE
  has_tag_criteria BOOLEAN := array_length(tag_names, 1) > 0;
  has_filename_criteria BOOLEAN := array_length(filename_terms, 1) > 0;
  filename_condition TEXT;
  i INTEGER;
BEGIN
  -- Build filename search condition
  IF has_filename_criteria THEN
    filename_condition := 'f.title ILIKE ''%' || filename_terms[1] || '%''';
    FOR i IN 2..array_length(filename_terms, 1) LOOP
      filename_condition := filename_condition || ' OR f.title ILIKE ''%' || filename_terms[i] || '%''';
    END LOOP;
  END IF;

  -- Case 1: Only filename search
  IF has_filename_criteria AND NOT has_tag_criteria THEN
    RETURN QUERY EXECUTE format('
      SELECT 
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ''{}'') as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      LEFT JOIN summaries s ON f.id = s.file_id
      LEFT JOIN summary_tags st ON s.id = st.summary_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = $1
        AND f.status = ''completed''
        AND (%s)
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC NULLS LAST', filename_condition)
    USING user_uuid;

  -- Case 2: Only tag search (existing logic)
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
        ARRAY_AGG(DISTINCT t.name) as tags
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
          WHERE t2.name = ANY(tag_names)
          GROUP BY st2.summary_id
          HAVING COUNT(DISTINCT t2.name) = array_length(tag_names, 1)
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
        ARRAY_AGG(DISTINCT t.name) as tags
      FROM files f
      LEFT JOIN folders fo ON f.folder_id = fo.id
      JOIN summaries s ON f.id = s.file_id
      JOIN summary_tags st ON s.id = st.summary_id
      JOIN tags t ON st.tag_id = t.id
      WHERE f.user_id = user_uuid
        AND f.status = 'completed'
        AND t.name = ANY(tag_names)
      GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
      ORDER BY s.created_at DESC;
    END IF;

  -- Case 3: Both tag and filename search (OR logic between the two types)
  ELSIF has_tag_criteria AND has_filename_criteria THEN
    IF tag_search_logic = 'and' THEN
      RETURN QUERY EXECUTE format('
        SELECT DISTINCT
          f.id as file_id,
          f.title,
          f.file_type,
          f.status,
          f.created_at,
          fo.name as folder_name,
          s.summary_text,
          COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ''{}'') as tags
        FROM files f
        LEFT JOIN folders fo ON f.folder_id = fo.id
        LEFT JOIN summaries s ON f.id = s.file_id
        LEFT JOIN summary_tags st ON s.id = st.summary_id
        LEFT JOIN tags t ON st.tag_id = t.id
        WHERE f.user_id = $1
          AND f.status = ''completed''
          AND (
            (%s) OR
            (s.id IN (
              SELECT st2.summary_id
              FROM summary_tags st2
              JOIN tags t2 ON st2.tag_id = t2.id
              WHERE t2.name = ANY($2)
              GROUP BY st2.summary_id
              HAVING COUNT(DISTINCT t2.name) = array_length($2, 1)
            ))
          )
        GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
        ORDER BY s.created_at DESC NULLS LAST', filename_condition)
      USING user_uuid, tag_names;
    ELSE
      RETURN QUERY EXECUTE format('
        SELECT DISTINCT
          f.id as file_id,
          f.title,
          f.file_type,
          f.status,
          f.created_at,
          fo.name as folder_name,
          s.summary_text,
          COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ''{}'') as tags
        FROM files f
        LEFT JOIN folders fo ON f.folder_id = fo.id
        LEFT JOIN summaries s ON f.id = s.file_id
        LEFT JOIN summary_tags st ON s.id = st.summary_id
        LEFT JOIN tags t ON st.tag_id = t.id
        WHERE f.user_id = $1
          AND f.status = ''completed''
          AND (
            (%s) OR
            (t.name = ANY($2))
          )
        GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
        ORDER BY s.created_at DESC NULLS LAST', filename_condition)
      USING user_uuid, tag_names;
    END IF;

  -- Case 4: No search criteria (return empty)
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index on files.title for better search performance
CREATE INDEX IF NOT EXISTS idx_files_title_search ON files USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_files_title_ilike ON files (title text_pattern_ops);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_filename_suggestions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_files_by_mixed_criteria(UUID, TEXT[], TEXT[], TEXT) TO authenticated;