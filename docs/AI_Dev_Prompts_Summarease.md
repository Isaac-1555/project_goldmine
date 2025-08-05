# AI Development Prompts – SummarEase

## General
- "Create a web application named SummarEase that allows users to record lectures or upload documents. The system should transcribe and summarize the content using the Gemini API and store all data and metadata in a Postgres database managed by Supabase."
- "Generate a dashboard UI featuring a main content area, a right sidebar for file and folder navigation, and a left sidebar for a persistent AI chat assistant."

## Recording and Transcription
- "Build an audio recorder that saves a recording as an audio file. This file should be sent to a serverless function that uses the Gemini API for transcription. Implement a retry mechanism: attempt transcription up to three times on API failure. If it continues to fail, update the file's status to 'failed' and notify the user."
- "Proceed with transcription and summarization even if the audio quality is low. The user will have the ability to edit the generated text."

## Upload and Summarize
- "Implement functionality for PDF or DOCX file uploads. Create a processing pipeline that extracts the text, generates a concise summary using the Gemini API, and stores the original file, its extracted text, and the summary."

## AI Chat Assistant (RAG)
- "Create a chat interface that operates within the context of the currently viewed summary or transcript. Given the text content and a user query, use the Gemini API to perform the following actions:
    1.  Answer specific questions about the content (e.g., 'What was the key finding mentioned?').
    2.  Fulfill re-summarization requests (e.g., 'Summarize this in three bullet points' or 'Explain this concept to me like I'm a beginner')."

## Flashcards and Quizzes
- "Based on the final summary text provided by the user (post-edit), generate five flashcards (with front and back text) and five multiple-choice quiz questions using the Gemini API. Store these items in the database, linked to the parent summary."

## Tagging and Linking
- "From a given summary, prompt the Gemini API to extract 3–7 relevant keywords or tags. For each extracted tag, first query the `tags` table to check for its existence. If it exists, use the existing `tag_id`. If not, create a new entry in the `tags` table. Finally, link the summary to these tags via the `summary_tags` join table. Provide a UI for the user to add or delete these tags manually."

## Knowledge Graph Component
- "Create a React component for the Knowledge Graph view using a library like React Flow (recommended) or D3.js.
  1.  **Data Fetching**: Fetch all of the user's summaries and their associated tags.
  2.  **Node Rendering**: Render each summary as a distinct node, using the file's title as the label.
  3.  **Edge Rendering**: When two or more summaries share the same tag, draw an edge connecting their respective nodes.
  4.  **Interactivity**:
      - The graph must be pannable and zoomable.
      - Nodes must be draggable.
      - On hover, display a tooltip over a node showing the first few lines of its summary.
      - On click, navigate the user to the full view of that summary.
  5.  **Layout**: Implement a force-directed layout algorithm to automatically position nodes, ensuring that summaries with shared tags cluster together organically."
