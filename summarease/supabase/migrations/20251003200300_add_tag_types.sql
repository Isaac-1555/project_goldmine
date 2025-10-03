-- Add tag type support to the tags table
-- This enables categorization of tags as general, specific, or user_added

BEGIN;

-- Add the type column to the tags table
ALTER TABLE public.tags 
ADD COLUMN type TEXT DEFAULT 'general' CHECK (type IN ('general', 'specific', 'user_added'));

-- Set existing tags to 'general' type by default
UPDATE public.tags SET type = 'general' WHERE type IS NULL;

-- Make type NOT NULL after setting defaults
ALTER TABLE public.tags ALTER COLUMN type SET NOT NULL;

-- Add index for better performance when filtering by tag type
CREATE INDEX IF NOT EXISTS idx_tags_type ON public.tags(type);

-- Update the get_user_files_with_metadata function to include tag types
CREATE OR REPLACE FUNCTION public.get_user_files_with_metadata(user_uuid UUID)
RETURNS TABLE (
    file_id UUID,
    title TEXT,
    file_type TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    folder_name TEXT,
    summary_text TEXT,
    tags JSONB  -- Changed from TEXT[] to JSONB to include type info
) AS $$
BEGIN
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
                jsonb_build_object(
                    'name', t.name,
                    'type', t.type
                )
            ) FILTER (WHERE t.name IS NOT NULL),
            '[]'::jsonb
        ) as tags
    FROM public.files f
    LEFT JOIN public.folders fo ON f.folder_id = fo.id
    LEFT JOIN public.summaries s ON f.id = s.file_id
    LEFT JOIN public.summary_tags st ON s.id = st.summary_id
    LEFT JOIN public.tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
    GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_knowledge_graph_data function to include tag types
CREATE OR REPLACE FUNCTION public.get_knowledge_graph_data(user_uuid UUID)
RETURNS TABLE (
    summary_id UUID,
    file_title TEXT,
    summary_text TEXT,
    tags JSONB  -- Changed from TEXT[] to JSONB to include type info
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as summary_id,
        f.title as file_title,
        s.summary_text,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'name', t.name,
                    'type', t.type
                )
            ),
            '[]'::jsonb
        ) as tags
    FROM public.summaries s
    JOIN public.files f ON s.file_id = f.id
    LEFT JOIN public.summary_tags st ON s.id = st.summary_id
    LEFT JOIN public.tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
    GROUP BY s.id, f.title, s.summary_text
    HAVING COUNT(t.id) > 0
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update search functions to handle tag types in returned data
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
  tags JSONB  -- Changed from TEXT[] to JSONB to include type info
) AS $$
DECLARE
  lower_tag_names TEXT[];
BEGIN
  -- Convert all tag names to lowercase for comparison
  SELECT array_agg(LOWER(tag_name)) INTO lower_tag_names
  FROM unnest(tag_names) AS tag_name;

  IF search_logic = 'and' THEN
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
          DISTINCT jsonb_build_object(
            'name', t.name,
            'type', t.type
          )
        ) FILTER (WHERE t.name IS NOT NULL),
        '[]'::jsonb
      ) as tags
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
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'name', t.name,
            'type', t.type
          )
        ) FILTER (WHERE t.name IS NOT NULL),
        '[]'::jsonb
      ) as tags
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_files_by_tags(UUID, TEXT[], TEXT) TO authenticated;

-- Create helper function to create tags with type
CREATE OR REPLACE FUNCTION create_tag_with_type(
  tag_name TEXT,
  tag_type TEXT DEFAULT 'general'
)
RETURNS UUID AS $$
DECLARE
  tag_id UUID;
BEGIN
  -- Check if tag exists
  SELECT id INTO tag_id
  FROM tags 
  WHERE name = LOWER(tag_name);
  
  IF tag_id IS NULL THEN
    -- Create new tag
    INSERT INTO tags (name, type)
    VALUES (LOWER(tag_name), tag_type)
    RETURNING id INTO tag_id;
  END IF;
  
  RETURN tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_tag_with_type(TEXT, TEXT) TO authenticated;

COMMIT;