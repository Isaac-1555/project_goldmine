-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);

-- Storage policies for files bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );