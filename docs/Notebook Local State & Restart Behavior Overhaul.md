# Notebook Local State & Restart Behavior Overhaul
## Problem statement
Local notebook persistence does not fully match the intended behavior of "restart where I left off" for recordings (transcripts), uploaded files, and written notes. There are two overlapping persistence mechanisms (a custom `useNotebookState` hook and manual localStorage handling in `NotebookTab`) that are only partially wired up. As a result, some state is not restored automatically, some shapes are inconsistent across components, and uploaded files cannot be reliably resumed and then uploaded after a browser restart.
## Current behavior (high level)
### 1. `useNotebookState` hook
* Defines `NotebookState` with fields for title, notes, `audioTranscript`, `uploadedFiles: File[]`, recording state, `leftPanelWidth`, and save metadata.
* Persists a minimal subset of state to localStorage under keys `sat-brain-notebook-state` (`NOTEBOOK_STATE`) and `sat-brain-local-notebooks` (`LOCAL_NOTEBOOKS`).
* Auto-saves (debounced) to both the current working state and the `LOCAL_NOTEBOOKS` collection when content changes.
* On initialization, restores only core text fields and layout state (title, notes, audioTranscript, leftPanelWidth, localSaveId, timestamps) from `NOTEBOOK_STATE`.
* Currently, no other component besides `NotebookTab` imports this hook, and `NotebookTab` only uses it for `leftPanelWidth` and `setLeftPanelWidth` on the `ResizableDivider`.
### 2. `NotebookTab` component
* Manages its own internal React state for title, notes, documents (a list of `DocumentItem`), recording state, save flags, custom tags, and folder selection, independent of `useNotebookState`.
* Records are turned into `DocumentItem` objects:
    * Transcript documents: generated in `processRecording` and appended to `documents` with `type: 'transcript'` and `content` set to transcript text.
    * Uploaded documents: created in `handleFileUpload` with `type: 'file'` and a `file: File` reference plus metadata.
* Local save behavior:
    * `handleLocalSave` writes snapshots to localStorage key `sat-brain-local-notebooks` with shape `{ id, title, notes, documents (with file stripped out), lastSaved, isLocalSave }`.
    * An effect auto-saves every 5 seconds whenever there is a title or notes or any documents, regardless of `useNotebookState`.
    * Manual Save button also calls `handleLocalSave`.
* Upload behavior (`handleDoneContent`):
    * In create mode, builds `uploadedFiles` from `documents` entries that still have a `file` reference and passes them to `createUnifiedContent`, along with concatenated transcript content (from transcript-type documents) and notes.
    * In edit mode for cloud notebooks, calls `updateNotebookContent` similarly with `newFiles` derived from `documents` that have a `file`.
    * For local notebooks (IDs starting with `local_`), `handleDoneContent` updates the localStorage entry instead of touching Supabase.
* Interaction with `useNotebookState` today is limited to `leftPanelWidth` persistence; notebook content is not read from or written through the hook.
### 3. View tab (`ListView`) and local notebook display
* `ListView` loads all local notebook snapshots directly from `sat-brain-local-notebooks` and keeps only the latest one (sorted by `lastSaved`).
* Local notebooks are rendered in a "Latest Local Notebook" section and can be:
    * Opened in `ContentViewer` via `handleLocalNotebookSelect`, which wraps the snapshot into a `FileWithMetadata` with a `localNotebookData` payload.
    * Edited in `NotebookTab` via `handleEditLocalNotebook`, which reconstructs a `documents: DocumentItem[]` array from the stored `documents` field.
* Shape mismatch:
    * Snapshots stored by `NotebookTab` have `{ title, notes, documents, lastSaved, isLocalSave }` but no top-level `audioTranscript`, `uploadedFiles`, or `recordingTime` fields.
    * `handleLocalNotebookSelect` assumes properties `{ notes, audioTranscript, uploadedFiles, recordingTime }` on the snapshot and builds `localNotebookData` from them.
    * As a result, for notebooks saved with the current `NotebookTab` implementation, `ContentViewer` sees `localNotebookData.audioTranscript` and `localNotebookData.uploadedFiles` as undefined and only has `notes`. Transcript text actually lives inside `documents` and is only surfaced when editing, not when viewing the local notebook.
### 4. Content viewing for local notebooks (`ContentViewer`)
* When `file.localNotebookData` is present, `ContentViewer` bypasses API calls and builds `fileDetails` from `localNotebookData`.
* It treats `localNotebookData.audioTranscript` as the source for the Transcript tab and `localNotebookData.uploadedFiles` as the list of documents.
* Because current snapshots do not populate those fields, local notebooks viewed here do not show transcripts or uploaded documents, even though that information is present inside `documents` in localStorage.
### 5. Behavior on browser refresh and notebook restart
* On initial mount of `NotebookTab` in create mode (no `editingContext`), content state comes only from props (`initialTitle`, `initialNotesHtml`, `initialDocuments`, etc.), which are null when starting fresh.
* `useNotebookState` does restore a prior `NOTEBOOK_STATE`, but `NotebookTab` does not bind title, notes, or documents to this state, so core notebook content is not restored on refresh.
* To resume a work-in-progress after a refresh, the user must go to the View tab, select the "Latest Local Notebook", and then click "Edit in Notebook". Even then, only notes and `DocumentItem` entries are restored; uploaded files lose their `file` references.
### 6. Uploaded files after restart
* When a notebook is auto-saved or manually saved and then reloaded from localStorage, `documents` entries for uploaded files are reconstructed without a `file` field (`file: undefined` by design to avoid serializing blobs in localStorage).
* When the user later clicks "Done" in a resumed session, `handleDoneContent` builds `uploadedFiles` from `documents` entries that still have a `file` reference. For resumed notebooks from localStorage, this list is empty.
* Net effect: transcripts and notes can be resumed and uploaded, but previously attached files are not included in the upload flow after a restart.
## Gaps vs intended behavior
1. **No automatic resume in NotebookTab**: On browser restart or page reload, the Notebook tab does not automatically restore the last working notebook (title, notes, transcripts, document list). Only left panel width is restored via `useNotebookState`, and resuming requires going through the View tab.
2. **Inconsistent representations of notebook content**: The `NotebookState` type, `NotebookTab` internal state, `sat-brain-local-notebooks` snapshots, `localNotebookData` in `FileWithMetadata`, and `ContentViewer` expectations all use slightly different shapes. This leads to missing transcripts and uploaded-file data in some views.
3. **Uploaded files are not resumable for final upload**: After a restart, local notebook snapshots remember that files existed (as `documents` with names and sizes) but drop the actual `File` objects. The current upload path only uses `File` references, so those uploaded documents are silently excluded when the user clicks Done on a resumed notebook.
4. **`useNotebookState` is effectively unused for content**: The centralized, auto-saving hook exists and persists a minimal notebook state, but `NotebookTab` does not use it for title, notes, transcripts, or uploaded documents. This duplicates logic and undermines the goal of a single source of truth.
5. **Docs and implementation are out of sync**: The notebook state management docs describe `useNotebookState` as the main state manager and mention different localStorage keys (`summarease-*`), while the active code still uses `sat-brain-*` keys and manual state in `NotebookTab`.
## Design goals
1. **True "restart where I left off" for the notebook tab**
* On loading the app and opening the Notebook tab, the most recent in-progress notebook (title, notes, transcript documents, and attached documents) should be restored automatically, without requiring a detour through the View tab.
2. **Single, coherent notebook state model**
* Use one canonical representation of notebook state that is shared between `NotebookTab`, the persistence layer, and any consumers like the View tab and `ContentViewer`.
3. **Robust local persistence with clear UX**
* Auto-save while editing, plus an explicit Save action that creates named local snapshots.
* Clear indications of what is stored locally, when it was last saved, and how to reset or discard local state.
4. **Predictable behavior for uploaded files**
* Persist enough information to show which files were attached when resuming a notebook.
* Clearly define what happens when uploading to Supabase from a resumed session (either support resuming file uploads via IndexedDB, or require re-selecting files with a clear prompt).
5. **Backwards compatibility for existing local saves (as much as practical)**
* Continue to recognize existing `sat-brain-local-notebooks` entries and the current `sat-brain-notebook-state`, migrating them to the new structure where feasible.
## Proposed high-level design
### 1. Make `useNotebookState` the single source of truth
* Extend `NotebookState` so it fully models what `NotebookTab` needs:
    * Core content: title, notes (HTML), a structured transcript field, and a `documents` collection mirroring `DocumentItem` (id, name, type, size, content, timestamp, and an optional `file` reference for in-memory use).
    * Recording state: `isRecording`, `isPaused`, `recordingTime`, plus any transcript-in-progress fields currently tracked in `NotebookTab`.
    * Layout and UI: `leftPanelWidth`, selected folder ID, custom tags, notification flags if needed.
* Update `useNotebookState` persistence so that:
    * `NOTEBOOK_STATE` holds the latest working notebook (the thing you resume in the Notebook tab).
    * `LOCAL_NOTEBOOKS` holds saved snapshots (manual saves and auto-saves for the View tab), each with a consistent shape derived from `NotebookState`.
* Make `NotebookTab` read and write all notebook content via `useNotebookState` instead of local `useState` where possible.
### 2. Normalize snapshot and view-layer representations
* Define a single "serialized notebook snapshot" interface (e.g. `SerializedNotebook`) that is JSON-safe and can be stored in localStorage and passed around:
    * Includes title, notes HTML, concatenated transcript text, a `documents` array (with timestamp as ISO strings and no `File` objects), folder ID, and metadata (`id`, `lastSaved`, `isLocalSave`).
* Ensure the following sources all use this same shape:
    * Entries in `sat-brain-local-notebooks` (or a renamed key).
    * The payload used for `localNotebookData` in `FileWithMetadata` for ContentViewer.
    * The props used to construct `editingContext` when editing a local notebook in `NotebookTab`.
* For transcript visibility:
    * Keep transcript text both as a top-level `transcriptText` (for ContentViewer's Transcript tab) and as one or more `DocumentItem` entries of type `transcript` (for the NotebookTab document list).
### 3. Define behavior for uploaded files across restarts
* For local snapshots and `NOTEBOOK_STATE`:
    * Persist uploaded file entries in `documents` with name, size, type, and timestamp but without `File` blobs.
    * When restoring into `NotebookTab`, show these documents in the list with appropriate metadata and a badge indicating that the actual file must be re-attached before upload.
* For upload to Supabase from a resumed notebook:
    * At `handleDoneContent` time, treat any document without a `file` as "metadata-only" and exclude it from `uploadedFiles` passed to `createUnifiedContent` or `updateNotebookContent`.
    * Before finalizing, if such "metadata-only" documents exist, display a clear prompt listing them and asking the user either to re-select the files or proceed knowing those files will not be uploaded.
* Optionally (future enhancement): introduce an IndexedDB-backed store for `Blob`s keyed by local notebook ID and document ID to enable true offline resumption of uploaded files without re-selection. This can be layered behind the same `documents` metadata without changing the public shape.
### 4. Auto-resume semantics in NotebookTab
* When `NotebookTab` mounts in create mode and no `editingContext` is active:
    * Use `useNotebookState` to load the latest `NOTEBOOK_STATE` and immediately bind title, notes, transcript text, documents, recording time, and layout.
    * If there is no prior `NOTEBOOK_STATE` (fresh user or cleared cache), start from `INITIAL_STATE`.
* Add an explicit "Start New Notebook" or "Clear current notebook" control that calls `resetNotebook` and clears `NOTEBOOK_STATE` and related local snapshot, giving users a way to abandon a draft.
## Implementation plan
### Step 1: Align notebook types and storage keys
1. Update `NotebookState` in `useNotebookState.ts` to include a JSON-serializable `documents` collection (mirroring `DocumentItem` minus `file`) and a `transcriptText` field that holds the combined transcript used elsewhere.
2. Introduce a `SerializedNotebook` type shared between the hook, `NotebookTab`, `ListView`, and `ContentViewer` that describes the structure saved in localStorage.
3. Keep existing `sat-brain-*` keys for backward compatibility but add a migration path in the hook:
    * On first load, read from both old shapes (if any) and map them into the new `NotebookState` and `SerializedNotebook` structures.
    * Optionally write back in the new shape to simplify future logic.
### Step 2: Refactor `useNotebookState` persistence logic
1. Adjust the `saveToLocalStorage` logic so that:
    * It derives a `SerializedNotebook` snapshot from the current `NotebookState`.
    * It updates or inserts this snapshot into the `LOCAL_NOTEBOOKS` array by ID.
    * It persists a separate lightweight `NOTEBOOK_STATE` containing the full working state needed to resume in `NotebookTab`.
2. Ensure auto-save behavior is driven by `hasUnsavedChanges` flags in `NotebookState` and that saving clears this flag.
3. Keep immediate persistence of essential fields (title, notes, transcript, layout) for resilience, while keeping heavy work (snapshot updates) debounced to avoid excessive writes.
### Step 3: Rewire `NotebookTab` to use `useNotebookState` for content
1. Replace local `useState` variables for title, notes, recording state, and possibly documents with values from `NotebookState` and corresponding action methods in `useNotebookState` (extending the hook API as needed).
2. Update handlers:
    * `handleFileUpload` should call a `notebookActions.addUploadedFiles` or `addDocuments` that updates both state and persistence.
    * Recording-related handlers (`startRecording`, `pauseRecording`, `resumeRecording`, `stopRecording`, `processRecording`) should update transcript content and documents via the hook actions.
    * Notes changes from `NoteTaking` should use `setNotes` from the hook instead of local `setNotes`, ensuring `hasUnsavedChanges` is updated.
3. Remove the manual `handleLocalSave` implementation and the 5-second interval in `NotebookTab`, delegating local save behavior to the hook’s `saveLocally` / auto-save mechanisms.
4. Continue to use `leftPanelWidth` from `NotebookState` for the `ResizableDivider` so layout persistence stays centralized.
### Step 4: Implement auto-resume behavior in `NotebookTab`
1. On `NotebookTab` mount in create mode:
    * Let `useNotebookState` initialize from `NOTEBOOK_STATE` and immediately use that state to render title, notes, documents, transcript, and recording time.
    * Show a subtle banner or indicator if this is a restored notebook (e.g., "Restored draft from [timestamp]").
2. Provide a "Start new notebook" action that calls `resetNotebook` and clears `NOTEBOOK_STATE` and any associated local snapshot.
3. Ensure that switching between Notebook and other tabs does not clear or reinitialize `NotebookState`, so returning to the Notebook tab resumes where the user left off.
### Step 5: Normalize View tab and ContentViewer integration
1. Update `ListView.loadLocalNotebooks` so that it treats entries in `LOCAL_NOTEBOOKS` as `SerializedNotebook` instances and does not further reshape them.
2. Change `handleLocalNotebookSelect` to build `FileWithMetadata` with `localNotebookData` based directly on `SerializedNotebook` fields:
    * `notes` from `notesHtml`.
    * `audioTranscript` from `transcriptText`.
    * `uploadedFiles` from `documents` entries of type `file` (metadata only).
    * Optionally, expose transcript documents separately if needed for display.
3. Update `handleEditLocalNotebook` to reconstruct the `editingContext` for `NotebookTab` from `SerializedNotebook`:
    * Map `documents` into `DocumentItem[]` with `file: undefined` and timestamps restored as `Date` objects.
    * Pass `notesHtml`, `transcriptText`, tags (if persisted later), and folder info if needed.
4. In `ContentViewer`, rely on `localNotebookData` fields that match the `SerializedNotebook` shape (notes, transcriptText, documents metadata) so that local notebooks display transcripts and document metadata correctly.
### Step 6: Define UX for uploaded files on resumed notebooks
1. In `NotebookTab.handleDoneContent`, detect any `DocumentItem` of type `file` that lacks a `file` object (i.e., metadata-only entries coming from localStorage).
2. If such entries exist:
    * Before uploading, show a modal listing these files, explaining that they will be skipped unless the user re-selects them.
    * Provide options: "Reattach files" (opens the upload modal pre-populated with names for guidance) or "Continue without these files".
3. When the user re-uploads files, match them to metadata-only entries (by name and size) to reconstruct full `DocumentItem` objects with `file` references, and then proceed with `createUnifiedContent` / `updateNotebookContent` as usual.
4. After a successful upload (cloud save), call `clearLocalStorage` / `resetNotebook` to remove the corresponding `LOCAL_NOTEBOOKS` entry and working `NOTEBOOK_STATE`, ensuring the notebook is no longer treated as a local draft.
### Step 7: Testing and verification
1. Browser refresh flow:
    * Start a new notebook, add notes, record audio to generate a transcript, and upload at least one file.
    * Confirm that auto-save runs and that a refresh brings the Notebook tab back with the same title, notes, transcript documents, and document list.
2. Local snapshot flow:
    * Use the Save button to create a local snapshot, then navigate to the View tab.
    * Verify that "Latest Local Notebook" shows correct title and timestamp, and that opening it in ContentViewer displays notes, transcripts, and document metadata.
    * Click "Edit in Notebook" and ensure the Notebook tab is fully populated from the snapshot.
3. Upload-after-restart flow:
    * Save a notebook with transcripts and uploaded docs, refresh, and then upload via Done.
    * Confirm that the user is prompted to reattach missing files and that notes and transcripts are uploaded correctly.
4. Backward compatibility:
    * Seed localStorage with existing `sat-brain-notebook-state` / `sat-brain-local-notebooks` shapes, then load the app.
    * Verify that they are migrated or interpreted in a way that preserves as much content as possible in the new system.
5. Regression checks:
    * Ensure left panel width, view-tab filters, and other unrelated persisted preferences still behave as before.
    * Confirm no new console errors and that storage usage remains within reasonable limits for typical notebook sizes.
