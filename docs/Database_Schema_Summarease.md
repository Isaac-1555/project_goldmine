# Database Schema (PostgreSQL) - SummarEase

## Table: `users`
*Stores basic user information, managed by Supabase Auth.*

| Field       | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id          | UUID        | Primary Key (from `auth.users`)      |
| email       | VARCHAR     | Unique user email                    |
| created_at  | TIMESTAMPTZ | Timestamp of user creation           |

---

## Table: `folders`
*Allows users to organize their files into collections.*

| Field       | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id          | UUID        | Primary Key                          |
| user_id     | UUID        | Foreign Key → `users.id`             |
| name        | TEXT        | Name of the folder                   |
| created_at  | TIMESTAMPTZ | Timestamp of folder creation         |

---

## Table: `files`
*The central source object for all user-generated content.*

| Field        | Type        | Description                          |
|--------------|-------------|--------------------------------------|
| id           | UUID        | Primary Key                          |
| user_id      | UUID        | Foreign Key → `users.id`             |
| folder_id    | UUID        | Foreign Key → `folders.id` (nullable)|
| title        | TEXT        | User-defined name of the file        |
| file_type    | TEXT        | Enum-like: "audio", "pdf", "docx"    |
| storage_path | TEXT        | Path to object in Supabase Storage   |
| status       | TEXT        | Enum-like: "processing", etc.        |
| created_at   | TIMESTAMPTZ | Timestamp of file upload             |

---

## Table: `transcripts`
*Stores the full text extracted from an audio or document file.*

| Field       | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id          | UUID        | Primary Key                          |
| file_id     | UUID        | Foreign Key → `files.id`             |
| content     | TEXT        | Raw extracted or transcribed text    |
| created_at  | TIMESTAMPTZ | Timestamp of transcription           |

---

## Table: `summaries`
*Stores the AI-generated (and potentially user-edited) summary.*

| Field         | Type        | Description                          |
|---------------|-------------|--------------------------------------|
| id            | UUID        | Primary Key                          |
| file_id       | UUID        | Foreign Key → `files.id`             |
| summary_text  | TEXT        | The AI-generated summary             |
| created_at    | TIMESTAMPTZ | Timestamp of summary creation        |

---

## Table: `tags`
*A central table of all unique tags in the system to avoid duplication.*

| Field | Type | Description             |
|-------|------|-------------------------|
| id    | UUID | Primary Key             |
| name  | TEXT | Unique tag name         |

---

## Table: `summary_tags`
*Join table creating a many-to-many relationship between summaries and tags.*

| Field      | Type | Description                    |
|------------|------|--------------------------------|
| summary_id | UUID | Foreign Key → `summaries.id`   |
| tag_id     | UUID | Foreign Key → `tags.id`        |

---

## Table: `flashcards`
*Stores individual flashcards generated from a summary.*

| Field       | Type | Description                             |
|-------------|------|-----------------------------------------|
| id          | UUID | Primary Key                             |
| summary_id  | UUID | Foreign Key → `summaries.id`            |
| front_text  | TEXT | Term or concept for front of the card   |
| back_text   | TEXT | Explanation or answer for back of card  |

---

## Table: `quizzes`
*Stores the structure of a quiz generated from a summary.*

| Field         | Type  | Description                                    |
|---------------|--------|-----------------------------------------------|
| id            | UUID   | Primary Key                                    |
| summary_id    | UUID   | Foreign Key → `summaries.id`                   |
| question      | TEXT   | Quiz question                                  |
| options       | JSONB  | Array of strings representing answer options   |
| correct_index | INTEGER| Index of correct answer in the `options` array |

---

## Table: `quiz_attempts`
*Tracks user performance on quizzes for progress tracking.*

| Field          | Type        | Description                             |
|----------------|-------------|-----------------------------------------|
| id             | UUID        | Primary Key                             |
| quiz_id        | UUID        | Foreign Key → `quizzes.id`              |
| user_id        | UUID        | Foreign Key → `users.id`                |
| selected_index | INTEGER     | User's chosen answer index              |
| is_correct     | BOOLEAN     | Whether selected answer was correct     |
| attempted_at   | TIMESTAMPTZ | Timestamp of the attempt                |
