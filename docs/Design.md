# Design Specification – SummarEase

## Introduction
This document provides a detailed design specification for the SummarEase web application. It covers the user-facing design, from the public landing page to the core authenticated dashboard, including layout, component behavior, and key user interaction flows.

---

## 1. Landing Page (Public)
The landing page is the first point of contact for new users. Its purpose is to clearly communicate the app's value and guide visitors toward signing up.

### 1.1. Hero Section
*   **Layout**: Full-width section at the top of the page.
*   **Content**:
    *   **Headline**: A large, compelling headline, such as "Turn Lectures into Knowledge, Instantly."
    *   **Sub-headline**: A short sentence that elaborates on the value proposition, e.g., "Record, upload, and let AI summarize your content, generate study materials, and build your personal knowledge graph."
    *   **Visuals**: A clean, abstract background graphic or a high-quality image representing learning or technology.
    *   **Primary Call to Action (CTA)**: A prominent "Sign Up for Free" button.

### 1.2. Features Section
*   **Layout**: A three-column grid below the hero section. Each column details a core feature.
*   **Content**: Each feature block will contain:
    1.  **Icon**: A simple, relevant icon.
    2.  **Feature Title**: e.g., "Live Recording & Transcription".
    3.  **Description**: A 1-2 sentence explanation of the feature.
*   **Featured Items**:
    *   **Record & Summarize**: "Capture lectures or meetings in real-time. Our AI transcribes and summarizes the key points for you."
    *   **Visualize Your Knowledge**: "Connect ideas with an interactive knowledge graph. See how your summaries link together through shared topics."
    *   **Create Study Tools**: "Instantly generate flashcards and quizzes from any summary to reinforce your learning and test your understanding."

### 1.3. Call to Action (CTA)
*   A final CTA section at the bottom of the page with the "Sign Up for Free" button repeated.
*   The top navigation bar of the landing page will be simple, containing the app logo, a "Features" link (scrolls to the features section), and a "Log In" button for returning users.

---

## 2. Authentication Pages
The authentication pages should be clean, simple, and focused on a single task.

*   **Sign Up Page (`/signup`)**:
    *   A centered form with fields for "Email" and "Password".
    *   A "Sign Up" button.
    *   A link below the form: "Already have an account? Log In".
*   **Log In Page (`/login`)**:
    *   A centered form with fields for "Email" and "Password".
    *   A "Log In" button.
    *   A link below the form: "Don't have an account? Sign Up".

---

## 3. Main Application Dashboard
The dashboard is the core user experience after logging in.

### 3.1. Overall Layout
*   **Top Navigation Bar**: A persistent bar at the top of the screen containing the main navigation tabs.
*   **Main Content Area**: The central part of the screen where the content of the selected tab is displayed.
*   **Right Sidebar**: A persistent sidebar dedicated to the AI Chat Assistant.

### 3.2. Top Navigation Bar
A horizontal bar with clickable tabs:
*   **Record**: The default view for starting a new recording.
*   **View**: To browse and view existing summaries.
*   **Study Tools**: To access features like Quizzes and Flashcards.
*   **Settings**: For account and application settings.

### 3.3. Tab Content: Record
This is the primary creation interface.
*   **Initial State**:
    *   A large, central "Record" button with a microphone icon.
    *   A text area below, initially empty, labeled "Live Transcript".
*   **Recording State**:
    *   When "Record" is clicked, the UI changes:
        *   The "Record" button is replaced by "Pause" and "Stop" buttons.
        *   A timer showing the recording duration appears.
        *   The "Live Transcript" text area begins to populate with text in real-time as the user speaks.
*   **Post-Recording State**:
    *   When "Stop" is clicked, a modal window appears.
    *   The modal contains a single input field labeled "Title".
    *   The user must enter a title for their recording and click "Save Summary". The system then processes the recording in the background.

### 3.4. Tab Content: View
This tab is for browsing and consuming saved content. It contains two sub-tabs: "List View" and "Graph View".

#### 3.4.1. List View Sub-Tab
*   **Layout**: Displays a scrollable list of all saved summaries.
*   **List Item**: Each item in the list is a card that displays:
    *   The summary **Title**.
    *   The associated **Tags** below the title.
*   **Interaction**:
    1.  When a user clicks on a summary card, the main content area transitions to a "Document Viewer".
    2.  The Document Viewer displays the full, formatted text of the selected summary.
    3.  Simultaneously, the content of this summary is loaded into the context of the **AI Chat Sidebar**. The sidebar might display a message like, "Chatting about: [Summary Title]".

#### 3.4.2. Graph View Sub-Tab
*   **Layout**: The main content area becomes an interactive canvas for the knowledge graph.
*   **Visuals**:
    *   Each summary is rendered as a node (a point or circle) labeled with its title.
    *   Edges (lines) connect nodes that share one or more tags.
*   **Zoom Logic**:
    *   **Automatic Zoom**: The initial view will automatically adjust the zoom level to fit all nodes on the screen. If there are few nodes, it will be zoomed in; if there are many, it will be zoomed out.
    *   **Manual Zoom**: The user can use the mouse wheel or on-screen `[+]` and `[-]` buttons to zoom in and out manually.
*   **Interaction**: The user can pan the graph by clicking and dragging the canvas. Clicking a node navigates the user to the Document Viewer for that summary (as in the List View).

### 3.5. Tab Content: Study Tools
This tab is a hub for generative learning features.
*   **Initial View**: A menu with options like "Quizzes" and "Flashcards".
*   **Quiz Generator Flow**:
    1.  User clicks on "Quizzes".
    2.  The main content area displays a list of all their saved summaries.
    3.  User clicks on a summary from the list.
    4.  The view transitions to a quiz interface, displaying multiple-choice questions generated from the selected summary's content.

### 3.6. Tab Content: Settings
This tab allows for user-specific configuration.
*   **Sections**:
    *   **Account**: Manage email, password, and other profile details.
    *   **Preferences**: Options for theme (Light/Dark mode).
    *   **AI Configuration**:
        *   Contains a section titled "Custom Summary Prompt".
        *   This section has a text area where a user can write and save a custom prompt (e.g., "Summarize the following text in a professional tone using five bullet points."). This prompt will be used by the AI for all future summary generations.

### 3.7. The AI Chat Sidebar (Right)
*   **Layout**: A standard chat interface with a scrollable message history and a text input box at the bottom.
*   **Behavior**:
    *   **Default State**: When no summary is selected, the sidebar is inactive or displays a generic welcome message like, "Select a summary to start chatting about it."
    *   **Context-Loaded State**: When a summary is opened in the Document Viewer, the sidebar becomes active. The user can ask questions ("What were the main arguments in this text?"), request modifications ("Re-summarize this more concisely"), and get answers based *only* on the content of the loaded summary.