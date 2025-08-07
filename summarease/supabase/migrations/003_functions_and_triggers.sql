-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user's files with summaries and tags
CREATE OR REPLACE FUNCTION public.get_user_files_with_metadata(user_uuid UUID)
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
    RETURN QUERY
    SELECT 
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
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

-- Function to get knowledge graph data for a user
CREATE OR REPLACE FUNCTION public.get_knowledge_graph_data(user_uuid UUID)
RETURNS TABLE (
    summary_id UUID,
    file_title TEXT,
    summary_text TEXT,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as summary_id,
        f.title as file_title,
        s.summary_text,
        ARRAY_AGG(t.name) as tags
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