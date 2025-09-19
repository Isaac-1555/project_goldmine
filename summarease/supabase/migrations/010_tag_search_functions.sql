-- Function to get tag suggestions with usage count
CREATE OR REPLACE FUNCTION get_tag_suggestions(search_term TEXT)
RETURNS TABLE (
  name TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name,
    COUNT(st.summary_id) as usage_count
  FROM tags t
  LEFT JOIN summary_tags st ON t.id = st.tag_id
  WHERE t.name ILIKE '%' || search_term || '%'
  GROUP BY t.id, t.name
  ORDER BY usage_count DESC, t.name ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search files by tags with AND/OR logic
CREATE OR REPLACE FUNCTION search_files_by_tags(
  user_uuid UUID,
  tag_names TEXT[],
  search_logic TEXT DEFAULT 'and'
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
BEGIN
  IF search_logic = 'and' THEN
    -- AND logic: files must have ALL specified tags
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
    -- OR logic: files must have ANY of the specified tags
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tag_suggestions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_files_by_tags(UUID, TEXT[], TEXT) TO authenticated;