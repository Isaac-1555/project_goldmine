# Product Requirements Document (PRD) – SummarEase

## Project Overview
**Product Name**: SummarEase
**Type**: Web App
**Goal**: Help students and professionals capture information by recording lectures or uploading documents, then use AI to generate summaries, interactive study materials, and a connected knowledge graph.

## Core Features (MVP)
1.  **Audio Recording & Transcription**: Capture audio in-app and transcribe it using the Gemini API.
2.  **File Upload**: Support PDF and DOCX uploads for text extraction.
3.  **AI-Powered Content Generation**:
    *   **Summaries**: Create concise summaries from transcripts or documents.
    *   **Flashcards & Quizzes**: Generate interactive study aids from summaries.
    *   **Automated Tagging**: Extract keywords to link related content.
4.  **Interactive Knowledge Graph**: Provide a dynamic, force-directed graph visualization where summaries are represented as nodes and shared tags create links between them. This allows users to explore content clusters, discover hidden relationships between topics, and navigate their knowledge base visually. Clicking a node will take the user directly to that summary.
5.  **AI Chat Assistant**: A "chat with your content" sidebar to ask questions, verify details, and request re-summarization of the current document.
6.  **User Content Management**:
    *   **Editing**: Allow users to edit generated summaries.
    *   **Organization**: Allow users to create folders to organize their files.

## Target Users
- University students
- Researchers & Academics
- Knowledge workers & Lifelong learners

## Success Metrics
- **Engagement**: Summaries created per user per week; Quiz attempts and completion rates.
- **Quality**: User edits per summary (a lower frequency suggests higher AI accuracy); Positive user feedback on AI performance.
- **Retention**: Weekly and monthly active user retention rate.

## User Flow (Core)
1.  **Input**: User records audio or uploads a document. The file is assigned a `processing` status.
2.  **Processing**: The backend transcribes or extracts text, generates a summary, and extracts tags using the Gemini API.
3.  **Review & Edit**: The user is notified that the content is ready. They can view the summary and make manual edits as needed.
4.  **Interact**:
    *   The user generates flashcards or a quiz from the final summary.
    *   The user asks follow-up questions or requests a different summary format via the AI Chat Assistant.
    *   The user explores connections to other notes in the Knowledge Graph.
5.  **Organize**: The user assigns the file to a custom folder for better organization.

## Data & Sync Strategy
- **Source of Truth**: The cloud (Supabase) is the primary source of truth. This ensures data is safe, secure, and synced for a user who may access the service from multiple devices.
- **Local Functionality**: The browser's local storage may be used for caching to provide a fast, optimistic UI, but not for permanent storage. There is no full offline mode in the MVP.
