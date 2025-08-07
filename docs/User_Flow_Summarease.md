# User Flow – SummarEase

## Introduction

This document outlines the step-by-step user journey through the SummarEase web application. It covers the initial experience for new users, the login process for returning users, and the primary workflows for creating, reviewing, and exploring content within the dashboard.

---

## 1. New User Journey: Onboarding and First Use

This flow describes the path for a first-time visitor from discovery to creating their first piece of content.

### 1.1. Landing Page and Registration
*   **User Action**: Navigates to the application's root URL.
*   **System Response**: Displays the public landing page. The page contains:
    *   A clear value proposition in a hero section.
    *   A description of key features (Recording, Summarization, Knowledge Graph).
    *   A primary "Sign Up for Free" call-to-action (CTA) button.
    *   A "Log In" link for existing users.

*   **User Action**: Clicks the "Sign Up for Free" button.
*   **System Response**: Navigates the user to the registration page (`/signup`).

*   **User Action**: Fills out the registration form with an email and password, then clicks "Sign Up".
*   **System Response**:
    1.  The system performs client-side validation (e.g., checks for a valid email format, ensures password meets complexity requirements).
    2.  An API call is made to the authentication service to create a new user account.
    3.  **On Success**: The user is automatically logged in, and the system redirects them to the main application dashboard (`/dashboard`). The system sends a verification email to the user's provided address in the background.
    4.  **On Failure** (e.g., email already exists): An error message is displayed on the form, prompting the user to log in instead or use a different email.

### 1.2. First-Time Dashboard Experience
*   **User Action**: Lands on the dashboard for the first time after signing up.
*   **System Response**:
    1.  The main dashboard layout is displayed (Navigation Sidebar, Main Content Area, AI Chat Sidebar).
    2.  Because the user has no content yet, the main area displays an "empty state" welcome message.
    3.  This empty state includes a clear prompt to get started, such as a large button or guided text like: "Welcome to SummarEase! Record your first lecture or upload a document to begin."

---

## 2. Returning User Journey: Login and Access

This flow describes the simple and direct path for an existing user to access their account.

*   **User Action**: Navigates to the root URL and clicks the "Log In" link.
*   **System Response**: Navigates the user to the login page (`/login`).

*   **User Action**: Enters their registered email and password, then clicks "Log In".
*   **System Response**:
    1.  The system authenticates the credentials against the authentication service.
    2.  **On Success**: The user is redirected to their dashboard (`/dashboard`), which is now populated with their previously saved content.
    3.  **On Failure** (e.g., incorrect password): An "Invalid credentials" error message is displayed on the form.

---

## 3. Core Application Workflows

Once logged into the dashboard, a user can engage in several key activities.

### 3.1. Workflow A: Creating Content via Recording
*   **User Action**: Clicks the "Record" tab or button in the main navigation.
*   **System Response**: The main content area updates to show the recording interface. A prominent "Start Recording" button is displayed.

*   **User Action**: Clicks "Start Recording".
*   **System Response**:
    1.  The browser prompts the user for microphone access if it has not been granted previously.
    2.  Once access is granted, the recording begins. The UI provides visual feedback, such as a running timer and a waveform animation.

*   **User Action**: Finishes the lecture and clicks "Stop Recording".
*   **System Response**: The recording is stopped. A modal or form appears, prompting the user to provide a title for the recording.

*   **User Action**: Enters a title (e.g., "Biology Chapter 3 - Photosynthesis") and clicks "Save and Summarize".
*   **System Response**:
    1.  The audio file begins uploading to storage.
    2.  The new item appears in the file navigation sidebar with a "processing" status indicator (e.g., a spinner icon).
    3.  When the backend process is complete (transcription, summarization, and tagging), the status indicator changes to "completed". The user may receive a subtle in-app notification.

### 3.2. Workflow B: Reviewing and Interacting with a Summary
*   **User Action**: Clicks on the "My Summaries" or "Files" tab in the dashboard navigation.
*   **System Response**: The navigation sidebar shows all user-created folders and files. The main content area might show a list of recent summaries.

*   **User Action**: Clicks on a specific, completed file title (e.g., "Biology Chapter 3 - Photosynthesis") from the navigation sidebar.
*   **System Response**: The main content area updates to display the detailed view for that item, including:
    *   The full summary text.
    *   The full transcript (in a separate tab or collapsible section).
    *   The AI-generated tags.
    *   Buttons to "Generate Flashcards" or "Start Quiz".
    *   The AI Chat sidebar's context is now focused on this document's content.

### 3.3. Workflow C: Exploring the Knowledge Graph
*   **User Action**: Clicks on the "Knowledge Graph" tab in the dashboard navigation.
*   **System Response**: The main content area transitions to the Knowledge Graph visualization. All the user's summaries are rendered as nodes, connected by edges representing shared tags.

*   **User Action**: Hovers the mouse over a node.
*   **System Response**: A tooltip appears, displaying a preview of that summary's text.

*   **User Action**: Clicks and drags a node or the background canvas.
*   **System Response**: The user can manually rearrange the graph or pan the view to explore different clusters of information.

*   **User Action**: Clicks on a specific node in the graph.
*   **System Response**: The application navigates away from the graph and loads the detailed summary view for the selected node, as described in Workflow B.