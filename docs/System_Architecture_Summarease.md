# System Architecture – SummarEase

## Components Overview
- **Frontend**: React + Vite with standard CSS or CSS Modules.
- **Backend**: Serverless Functions (e.g., Supabase Edge Functions, Vercel Functions).
- **Database**: PostgreSQL (managed by Supabase).
- **Authentication**: Supabase Auth.
- **Object Storage**: Supabase Storage (for audio, PDF, DOCX files).
- **AI Services**: Google Gemini API (for transcription, summarization, Q&A, tagging, and content generation).

## Backend Strategy: Serverless Architecture
A serverless approach is ideal for this project as it minimizes infrastructure management and scales automatically with demand.
1.  **API Gateway**: User actions on the frontend (e.g., uploading a file) trigger HTTPS requests to serverless function endpoints.
2.  **Functions**: Each core task is encapsulated in a dedicated, stateless function:
    *   `process-file`: Triggered on upload. Orchestrates calls to the Gemini API for transcription/summarization.
    *   `generate-quiz`: Takes a summary ID and generates quiz content.
    *   `ai-chat`: Handles the RAG-based chat queries against document context.
3.  **Scalability & Cost-Effectiveness**: The pay-per-use model is cost-effective for a project with variable workloads. The platform can handle sudden spikes in usage (e.g., during exam seasons) without manual intervention or pre-provisioned capacity.

## Database Choice: Relational (PostgreSQL) vs. NoSQL
For SummarEase, a relational database like PostgreSQL is the superior choice due to the highly structured and interconnected nature of the application's data.

| Aspect | Relational (PostgreSQL via Supabase) | NoSQL (e.g., Firestore) |
| :--- | :--- | :--- |
| **Data Structure** | **Excellent Fit**. The data model has clear entities (users, files, summaries, tags) with defined relationships. Foreign keys enforce data integrity automatically. | **Poor Fit**. Would require denormalization (duplicating data) or complex client-side logic to handle relationships, especially the many-to-many link between summaries and tags. |
| **Querying** | **Powerful**. Complex queries, such as fetching a summary along with all its tags, quizzes, and parent file details, are efficient and straightforward using SQL `JOIN`s. | **Challenging**. Retrieving nested, related data can require multiple round-trip queries, increasing latency and code complexity. |
| **Consistency** | **Strong (ACID)**. Transactions guarantee that multi-step operations (e.g., creating a summary *and* its tags) complete fully or not at all, which is critical for application reliability. | **Eventual Consistency**. While simpler to scale horizontally, it is less ideal for operations that require immediate consistency across different data entities. |
| **Conclusion** | The predictable, relational structure of the app's data makes **PostgreSQL the clear winner** for ensuring data integrity, simplifying development, and enabling powerful queries. |

## Core Processing Flow
```mermaid
graph TD
    A[User Action: Upload/Record] --> B{Frontend};
    B --> C[Save File to Supabase Storage];
    C --> D{Trigger Serverless Function: process-file};
    D --> E{Gemini API: Transcribe/Summarize/Tag};
    subgraph Retry Loop
        E -- On Failure --> F[Retry up to 3x];
        F -- Still Fails --> G[Update Status in DB: 'failed'];
    end
    E -- On Success --> H[Save Content & Tags to DB];
    H --> I[Update Status in DB: 'completed'];
    I --> J{Notify Frontend of Completion};
    J --> K[User Views & Interacts with Content];
