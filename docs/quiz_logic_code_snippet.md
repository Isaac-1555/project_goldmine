# **Specification: Quiz Generation and Display Logic**

## **1. Objective**

To implement a feature that takes a user-provided text summary, sends it to the Gemini AI API to generate a multiple-choice quiz, and then displays this quiz interactively on the front-end. The entire process must be robust, with clear data contracts to prevent errors.

## **2. High-Level Workflow**

1.  **User Input**: The user pastes a text summary into a `<textarea>` on the front-end and clicks a "Generate Quiz" button.
2.  **API Request (Front-end to Backend)**: The front-end sends the summary text to our application's backend via a `POST` request.
3.  **Gemini API Call (Backend)**: The backend constructs a specific, structured prompt containing the user's summary and sends it to the Gemini AI API.
4.  **Gemini API Response**: Gemini processes the prompt and returns a structured JSON string containing the quiz data.
5.  **Data Parsing & Validation (Backend)**: The backend parses the JSON string, validates its structure, and handles any potential errors.
6.  **API Response (Backend to Front-end)**: The backend sends the validated and structured quiz data (as JSON) to the front-end.
7.  **UI Rendering (Front-end)**: The front-end receives the quiz data and dynamically renders the multiple-choice questions and options for the user.

## **3. Backend Logic**

The backend will have a single API endpoint to handle quiz generation.

### **3.1. API Endpoint**

*   **Route**: `POST /api/generate-quiz`
*   **Request Body**:
    ```json
    {
      "summaryText": "The user-provided text summary goes here...",
      "questionCount": 5 // Optional: Number of questions to generate
    }
    ```
*   **Success Response (200 OK)**:
    *   Returns the structured quiz data. See **Section 4: Data Structures** for the exact format.
*   **Error Responses**:
    *   `400 Bad Request`: If `summaryText` is missing or empty.
    *   `500 Internal Server Error`: If the Gemini API call fails or returns an unexpected format.

### **3.2. Gemini API Interaction (The Core Logic)**

This is the most critical step. To prevent the AI from "hallucinating" or returning unstructured text, we must use a very specific and strict prompt.

#### **The Prompt Template**

Use the following template to construct the prompt. It instructs the AI on its role, the input it's receiving, and the exact output format required.

```text
You are an expert exam creator. Your task is to generate a multiple-choice quiz based on the provided text summary.

**Instructions:**
1.  Read the text summary carefully.
2.  Generate exactly {questionCount} multiple-choice questions.
3.  Each question must have exactly 4 options.
4.  One of the options must be the correct answer.
5.  The output **MUST** be a valid JSON array of objects.
6.  Do not include any text, explanations, or markdown formatting outside of the main JSON array. The entire response body must be parseable as JSON.

**JSON Object Structure:**
Each object in the array must have the following keys:
- "question": A string containing the question text.
- "options": An array of 4 strings, representing the possible answers.
- "correctAnswerIndex": An integer (0, 1, 2, or 3) representing the index of the correct answer in the "options" array.

**Example of the required JSON output format:**
[
  {
    "question": "What is the primary pigment used in photosynthesis?",
    "options": [
      "Chlorophyll",
      "Carotene",
      "Xanthophyll",
      "Anthocyanin"
    ],
    "correctAnswerIndex": 0
  }
]

---
**Text Summary to use:**

{summaryText}
---

Now, generate the quiz based on the text summary above.
```

#### **Implementation Notes (Pseudocode)**

```javascript
// In your backend controller (e.g., Express.js)

async function handleGenerateQuiz(req, res) {
  const { summaryText, questionCount = 5 } = req.body;

  if (!summaryText) {
    return res.status(400).json({ error: 'summaryText is required.' });
  }

  // 1. Construct the detailed prompt
  const prompt = `... a long prompt from the template above ...`; // Use the template, injecting summaryText and questionCount

  try {
    // 2. Call the Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Clean the response to ensure it's a clean JSON string
    // Gemini might wrap the JSON in markdown backticks
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    // 3. Parse and Validate the response
    let quizData;
    try {
      quizData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("Gemini returned malformed JSON.");
    }

    // Optional but recommended: Add a validation step here to check if quizData
    // is an array and its objects have the correct keys.

    // 4. Send the structured data to the front-end
    return res.status(200).json(quizData);

  } catch (error) {
    console.error("Error generating quiz:", error);
    return res.status(500).json({ error: 'Failed to generate the quiz.' });
  }
}
```

## **4. Data Structures**

A clear data structure is the contract between the backend and front-end.

### **4.1. Quiz Data Format (API Response)**

The backend will always send an array of quiz objects to the front-end.

```json
[
  {
    "question": "What is the capital of France?",
    "options": [
      "Berlin",
      "Madrid",
      "Paris",
      "Rome"
    ],
    "correctAnswerIndex": 2
  },
  {
    "question": "Which planet is known as the Red Planet?",
    "options": [
      "Earth",
      "Mars",
      "Jupiter",
      "Venus"
    ],
    "correctAnswerIndex": 1
  }
]
```

## **5. Front-End Logic**

The front-end will manage the application state and render the UI based on that state. This example uses concepts common in frameworks like React, Vue, or Angular.

### **5.1. State Management**

The front-end needs to manage the following state variables:

*   `summaryText`: (string) The text entered by the user in the textarea.
*   `quizData`: (array | null) Holds the quiz data received from the backend. Initial value is `null`.
*   `currentQuestionIndex`: (number) The index of the question currently being displayed. Initial value is `0`.
*   `userAnswers`: (object) A dictionary to store the user's selected answers, e.g., `{ 0: 2, 1: 1 }` means the user chose option index 2 for question 0, and option index 1 for question 1.
*   `quizState`: (string) The current state of the UI. Can be one of:
    *   `'idle'` (waiting for user input)
    *   `'loading'` (waiting for the API response)
    *   `'active'` (quiz is being displayed)
    *   `'finished'` (quiz is complete and results are shown)
    *   `'error'` (an error occurred)
*   `errorMessage`: (string | null) Stores the error message if `quizState` is `'error'`.

### **5.2. UI Rendering Logic (Pseudocode)**

```javascript
// Component structure pseudocode (React-like)

function QuizComponent() {
  // ... all the state variables from 5.1 ...

  const handleGenerateQuiz = async () => {
    setQuizState('loading');
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryText: summaryText, questionCount: 5 })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz data.');
      }

      const data = await response.json();
      setQuizData(data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setQuizState('active');

    } catch (err) {
      setErrorMessage(err.message);
      setQuizState('error');
    }
  };

  // Render logic based on quizState
  if (quizState === 'loading') {
    return <Spinner />;
  }

  if (quizState === 'error') {
    return <ErrorMessage message={errorMessage} />;
  }

  if (quizState === 'active' && quizData) {
    const currentQuestion = quizData[currentQuestionIndex];
    return (
      <div>
        <h2>{currentQuestion.question}</h2>
        <ul>
          {currentQuestion.options.map((option, index) => (
            <li key={index}>
              <button
                onClick={() => handleAnswerSelect(index)}
                className={userAnswers[currentQuestionIndex] === index ? 'selected' : ''}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={handleNextQuestion}>Next</button>
      </div>
    );
  }

  // Render the initial view ('idle') or the finished view
  return (
    <div>
      <textarea onChange={(e) => setSummaryText(e.target.value)} />
      <button onClick={handleGenerateQuiz}>Generate Quiz</button>
    </div>
  );
}
```