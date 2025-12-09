# Integrate Jarvis-style lecture recording & transcription into SummarEase
## Problem and goals
SummarEase can already record audio and transcribe with Gemini, but long lectures need better accuracy, robustness, and readability (fewer filler words, clearer structure). The goal is to adopt the most useful ideas from the Jarvis AI Assistant repo (separation of STT and LLM cleanup, strong STT engines, good UX) without turning SummarEase into a native desktop app.
## Current state in SummarEase
* `AudioRecorder` (`src/components/Recording/AudioRecorder.tsx`) records audio in the browser using `MediaRecorder` (WebM), supports start/pause/resume/stop, and shows optional live captions via `LiveTranscriber`.
* `LiveTranscriber` (`src/lib/webSpeechTranscription.ts`) wraps the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) to emit interim and final transcripts, with basic error handling and a fixed `en-US` language.
* `transcriptionService.transcribeAudio` (`src/lib/transcriptionService.ts`) turns an audio `Blob` into base64 and calls Gemini 2.5 Flash once with a simple “please transcribe this audio file” instruction, returning the first candidate’s text. There is no explicit separation between raw STT and later cleanup, no diarization, and no multi-step processing for very long recordings.
## Relevant patterns from Jarvis AI Assistant
* Jarvis separates raw speech recognition from an LLM “rewrite” stage: first it gets a raw transcript from a speech engine (local Whisper or cloud STT like Deepgram), then it uses an LLM to clean punctuation, remove filler words, and optionally change formatting (paragraphs, bullets, summaries, etc.).
* It supports multiple STT backends (local and cloud) behind a common abstraction, so it can switch engines or fall back if one fails.
* The UX is optimized for low-friction capture and reliable output: press-and-hold recording, streaming or near-real-time text, and a final stable transcript suitable for pasting or saving as notes.
These patterns are directly applicable to SummarEase’s lecture capture, even though SummarEase is a web app with Supabase rather than a native Mac app.
## Proposed architecture changes
### 1. Introduce a transcription provider abstraction
Define a small abstraction in the frontend (and/or in a Supabase Edge Function) for transcription providers, inspired by Jarvis’ separation of engines:
* Interface like `TranscriptionProvider` with methods such as `transcribeBlob(blob, options)` that return a raw transcript and metadata (duration, language, confidence if available).
* Move the existing Gemini audio call from `transcriptionService.ts` into a `GeminiTranscriber` implementation so it fits the same abstraction.
* Add room for a second implementation (for example, a Deepgram-based `StreamingTranscriber` that talks to a backend endpoint), even if we do not implement it immediately.
### 2. Add a Jarvis-style LLM cleanup and structuring stage
Introduce a distinct post-processing step that always takes a raw transcript and produces lecture-friendly text:
* New module (for example `lecturePostprocessor.ts`) that calls Gemini with prompts designed to:
    * produce a “clean” transcript (fix punctuation and casing, remove filler words and false starts, keep meaning intact), and
    * optionally produce a second variant optimized for studying (section headings, bullet points, key takeaways) and a short summary.
* Wire this so `transcriptionService` (or a higher-level orchestration layer) first obtains the raw transcript via a `TranscriptionProvider`, then runs the postprocessor and returns both raw and cleaned versions.
* Persist both forms in the database so downstream features (flashcards, quizzes, knowledge graph) can choose which text to consume.
### 3. Improve long-lecture handling and UX
Adapt the recording and transcription flow so it behaves more like Jarvis for long lectures while staying within browser and Supabase constraints:
* Extend `AudioRecorder` with a "lecture mode" that makes it clear to users when they are capturing a long session versus a short note.
* In lecture mode, upload the recorded audio (or periodic chunks, depending on size limits) to Supabase Storage as soon as recording stops, and trigger a background transcription job (via Supabase Edge Function or other backend path) that runs the STT provider and LLM cleanup.
* Update the UI to show a clear status for each lecture recording (processing, completed, failed) and expose both raw and cleaned transcripts when ready, replacing Web Speech live captions as the primary source of truth for long recordings while still keeping Web Speech as an optional, best-effort live preview.
### 4. Configuration, safety, and cost controls
Add minimal configuration modeled after Jarvis’ engine selection and modes, but tailored to SummarEase:
* Per-user or global settings to choose the default transcription engine (Gemini-only to start; room to add another provider later), target language, and whether “cleaned lecture transcript” and “study notes” variants should be generated automatically.
* Basic safeguards for lecture length and file size (enforced in the UI and, if necessary, in backend functions), plus chunking or batching strategy for very long lectures to avoid timeouts and token limits when talking to Gemini.
* Structured error handling so failures in STT or LLM cleanup are surfaced gracefully (users at least keep their audio and any partial transcript), and logs in Supabase make it easy to debug issues later.
## Scope and non-goals for first implementation
Scope for the initial integration is to reuse Jarvis’ architectural ideas (STT abstraction, separate LLM cleanup stage, better UX for long recordings) inside SummarEase’s existing web and Supabase stack. Recreating Jarvis’ Mac-wide global hotkey behavior, native UI, or full multi-engine STT matrix is explicitly out of scope for now.