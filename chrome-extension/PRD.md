# Reply Guy Chrome Extension Product Requirements Document (PRD)

**Version:** 1.0
**Date:** July 4, 2025
**Author:** Gemini CLI Agent

---

## 1. Introduction

This document outlines the requirements for the Reply Guy Chrome Extension. The primary goal of this extension is to seamlessly integrate Reply Guy's AI-powered writing tools directly into the Twitter (now X) interface, allowing users to generate replies, suggestions, and memes without leaving their social media workflow. This aims to enhance user productivity and engagement with the Reply Guy service.

---

## 2. Goals

*   **Enhance User Experience:** Provide a frictionless way for Reply Guy users to access core features directly within Twitter.
*   **Increase Engagement:** Encourage more frequent use of Reply Guy by making it readily available where users are already active.
*   **Streamline Workflow:** Eliminate the need for users to switch between the Twitter website and the Reply Guy web application for common tasks.

---

## 3. User Stories

*   **As a Reply Guy user,** I want to generate a full reply to a tweet directly from the Twitter interface so that I can quickly respond without switching tabs.
*   **As a Reply Guy user,** I want to get quick reply suggestions for a tweet directly on Twitter so that I can get ideas for my response.
*   **As a Reply Guy user,** I want to generate a meme for my reply directly on Twitter so that I can add visual humor to my responses.
*   **As a Reply Guy user,** I want to see my current Reply Guy usage limits (e.g., replies remaining, suggestions remaining) within the extension so that I can manage my usage.
*   **As a Reply Guy user,** I want the extension to automatically use my existing Reply Guy login session so that I don't have to log in separately.

---

## 4. Scope

### In Scope (Minimum Viable Product - MVP)

*   **Twitter UI Integration:**
    *   Detection of tweet composition areas (e.g., new tweet box, reply box).
    *   Injection of a "Reply Guy" button or similar UI element.
    *   Extraction of the original tweet text (for replies) and the user's current input.
    *   Injection of generated text (reply, suggestion, meme text) back into the Twitter composition area.
*   **Reply Guy API Integration:**
    *   Integration with `/api/generate` for full reply generation.
    *   Integration with `/api/suggest` for quick reply suggestions.
    *   Integration with `/api/meme` for meme generation (assuming meme text is generated separately or provided).
    *   Integration with `/api/check-limits` and `/api/user/plan` for displaying user usage.
*   **Authentication:**
    *   Leverage existing Supabase authentication cookies from the Reply Guy web application.
    *   If no active session is found, guide the user to log in via the Reply Guy web app.
*   **Basic Extension UI:**
    *   A simple button/icon within the Twitter interface.
    *   A basic extension popup (as defined in `popup.html`) for general information or triggering actions.

### Out of Scope (for V1)

*   Integration with social media platforms other than Twitter/X.
*   Full Reply Guy dashboard features (e.g., detailed analytics, billing management) within the extension.
*   Complex user-configurable settings directly within the extension (beyond basic toggles if necessary).
*   Advanced Reply Guy features like custom styles, AI feedback, or detailed history within the extension.
*   Offline functionality.

---

## 5. Functional Requirements

### 5.1. Twitter UI Integration

*   **FR1.1:** The extension SHALL detect the presence of tweet composition input fields on Twitter.com and X.com.
*   **FR1.2:** The extension SHALL inject a clearly identifiable "Reply Guy" button or icon adjacent to or within the tweet composition area.
*   **FR1.3:** Upon activation, the extension SHALL be able to extract the text of the original tweet (if replying) and any text currently entered by the user in the composition field.
*   **FR1.4:** The extension SHALL be able to inject generated text (reply, suggestion, meme text) into the active tweet composition field, replacing or appending to existing content as appropriate.

### 5.2. Reply Guy API Integration

*   **FR2.1:** The extension SHALL be able to make authenticated requests to the Reply Guy backend APIs.
*   **FR2.2:** The extension SHALL call `/api/generate` to request a full AI-generated reply based on user input and context.
*   **FR2.3:** The extension SHALL call `/api/suggest` to request AI-generated reply suggestions.
*   **FR2.4:** The extension SHALL call `/api/meme` to request a meme image URL based on provided text and context.
*   **FR2.5:** The extension SHALL call `/api/check-limits` and `/api/user/plan` to retrieve and display the user's remaining reply, suggestion, and meme generation limits.
*   **FR2.6:** The extension SHALL handle API success responses by displaying the generated content to the user.
*   **FR2.7:** The extension SHALL handle API error responses (e.g., rate limits, internal server errors) by displaying appropriate error messages to the user.

### 5.3. Authentication

*   **FR3.1:** The extension SHALL attempt to read and utilize the user's existing Supabase authentication session cookies from the Reply Guy web application.
*   **FR3.2:** If no valid session is found, the extension SHALL inform the user and provide a clear call to action (e.g., a button) to open the Reply Guy web application for login.
*   **FR3.3:** The extension SHALL automatically detect when the user has successfully logged in via the web application and update its authentication state.

### 5.4. User Interface (Extension)

*   **FR4.1:** The injected UI element on Twitter SHALL be visually distinct but blend reasonably with the Twitter interface.
*   **FR4.2:** The extension popup SHALL provide a simple interface for triggering core actions (e.g., "Generate Reply", "Get Suggestions").
*   **FR4.3:** The extension SHALL display the user's current usage limits in an easily understandable format.

---

## 6. Non-Functional Requirements

*   **Performance:**
    *   **NFR6.1:** API calls from the extension SHALL have a response time of less than 3 seconds for typical requests.
    *   **NFR6.2:** The extension SHALL not noticeably degrade the performance or responsiveness of the Twitter website.
*   **Security:**
    *   **NFR6.3:** The extension SHALL securely handle user authentication tokens and API keys, never exposing them client-side or in logs.
    *   **NFR6.4:** All communication with the Reply Guy backend SHALL use HTTPS.
*   **Reliability:**
    *   **NFR6.5:** The extension SHALL gracefully handle changes to the Twitter UI, minimizing breakage.
    *   **NFR6.6:** The extension SHALL provide clear and actionable error messages to the user in case of API failures or other issues.
*   **Compatibility:**
    *   **NFR6.7:** The extension SHALL be compatible with the latest stable version of Google Chrome.
*   **Maintainability:**
    *   **NFR6.8:** The codebase SHALL be modular, well-commented, and follow best practices for Chrome extension development.

---

## 7. Technical Considerations

*   **Manifest V3:** The extension will be developed using Chrome Extension Manifest V3.
*   **Content Scripts:** Used for injecting UI elements and interacting with the Twitter DOM.
*   **Background Service Worker:** Used for handling API requests to the Reply Guy backend and managing authentication state.
*   **Supabase Client-Side Authentication:** Leveraging `chrome.cookies` API to access Supabase session cookies for authentication.
*   **DOM Manipulation:** Careful and resilient DOM manipulation techniques will be required to interact with the Twitter UI, given its dynamic nature.

---

## 8. Future Considerations (Out of Scope for V1)

*   Integration with other social media platforms (e.g., LinkedIn, Facebook).
*   Providing more granular control over Reply Guy features (e.g., tone selection, custom styles) directly within the extension UI.
*   Displaying a history of generated replies/suggestions within the extension.
*   Push notifications for new features or usage alerts.
*   Integration with other Reply Guy features like research suggestions.
