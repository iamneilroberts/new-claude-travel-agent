## 8. Conversational Client Record Maintenance Flow

This section outlines the specific conversational flow for viewing and updating client records interactively.

**Goal:** To provide a user-friendly way to manage client data, simulating a maintenance screen experience through conversation and artifact display.

**Core Principles for this Flow:**
*   Display only editable fields by default.
*   Show empty/NULL fields as blank in the artifact.
*   Initiate updates with an open-ended question.
*   Parse user's natural language for updates, including fuzzy matching for field names.
*   Confirm all changes with the user before execution.
*   Re-prompt for specific invalid fields for iterative correction.

**Editable Client Fields:**
The following fields from the `Clients` table are considered user-editable in this flow:
*   `first_name`
*   `last_name`
*   `email`
*   `phone`
*   `address`
*   `city`
*   `state`
*   `postal_code`
*   `country`
*   `date_of_birth` (Format: YYYY-MM-DD)
*   `passport_number`
*   `passport_expiry` (Format: YYYY-MM-DD)
*   `preferences`
*   `notes`

**Common Field Name Aliases for Fuzzy Matching (Examples):**
*   `date_of_birth`: "DOB", "Birth Date", "Birthday"
*   `passport_number`: "Passport", "Passport No"
*   `passport_expiry`: "Passport Expiration", "Passport Exp"
*   `first_name`: "First", "Given Name"
*   `last_name`: "Last", "Surname", "Family Name"
*   `postal_code`: "Zip Code", "Postcode"
*   (Add more as needed based on common user phrasing)

**Conversational Steps:**

**Step A: Search and Select Client**
1.  **User Input:** User initiates a client search (e.g., "Show me clients named Welford," "Find client Welford Guest 1").
2.  **Claude Action:**
    *   Use the `search_clients` tool with the provided name/email.
    *   If multiple clients are found:
        *   List them in the chat (e.g., "I found a few clients: 1. Welford Guest 1 (ID: 123), 2. Welford Guest 2 (ID: 124). Which one would you like to see?").
        *   Wait for user selection.
    *   If one client is found, or after user selection: Proceed to Step B.
    *   If no clients are found: Inform the user.

**Step B: Display Client Details in Artifact**
1.  **Claude Action:**
    *   Use the `get_client` tool with the `client_id` of the selected client.
    *   Construct a markdown table in the **artifact window** displaying *only the editable fields* listed above.
    *   Show blank for any field that is NULL or empty in the database.
    *   Include the client's full name and `client_id` as a title for the artifact table.
    *   *Artifact Example:*
        ```markdown
        **Client Details: Welford Guest 1 (ID: 123)**

        | Field             | Value         |
        |-------------------|---------------|
        | First Name        | Welford       |
        | Last Name         | Guest 1       |
        | Email             |               |
        | Phone             |               |
        | Address           |               |
        | City              |               |
        | State             |               |
        | Postal Code       |               |
        | Country           | United States |
        | Date of Birth     |               |
        | Passport Number   |               |
        | Passport Expiry   |               |
        | Preferences       |               |
        | Notes             |               |
        ```
2.  **Claude Chat Output:** "I've displayed the details for [Client Full Name] in the artifact. You can ask to update this client if you'd like to make changes."

**Step C: Initiate Update**
1.  **User Input:** User expresses intent to update (e.g., "Update this client," "I want to change some details for Welford Guest 1").
2.  **Claude Chat Output:** "Okay, what would you like to update for [Client Full Name]?"

**Step D: Parse User's Update Request**
1.  **User Input:** User provides changes in natural language (e.g., "Set her first name to Hannah and last name to Welford. Phone is 555-1212. Email: hannah@example.com. DOB is 1990-05-15.").
2.  **Claude Internal Action:**
    *   Carefully parse the user's free-form text to identify field-value pairs.
    *   Use the "Common Field Name Aliases" list for fuzzy matching.
    *   Attempt basic validation for formats (e.g., YYYY-MM-DD for dates, basic email structure).
    *   Store the successfully parsed and validated field-value pairs temporarily.

**Step E: Handle Invalid Input / Iterative Correction**
1.  **Claude Action (If invalid input detected):**
    *   If a value's format is incorrect (e.g., "DOB: May 15 1990"), re-prompt for *that specific field*: "The Date of Birth 'May 15 1990' isn't in the required YYYY-MM-DD format. Could you please provide it correctly?"
    *   If a field name is ambiguous or not recognized after fuzzy matching, ask for clarification for that part of the input.
2.  **User Input:** User provides the corrected information for the specific field.
3.  **Claude Action:** Update the temporary storage with the corrected field-value pair. Repeat Step E if other issues are found or if the user provides more changes. If all provided input is parsed and seems valid, proceed to Step F.

**Step F: Confirmation of Changes**
1.  **Claude Action:**
    *   Once all intended changes are parsed and validated, construct a summary of the proposed updates in the **artifact window**.
    *   *Artifact Example:*
        ```markdown
        **Confirm Update for Welford Guest 1 (ID: 123)**

        I'm about to make the following changes:
        - **First Name**: Hannah
        - **Last Name**: Welford
        - **Email**: hannah@example.com
        - **Phone**: 555-1212
        - **Date of Birth**: 1990-05-15
        - **Passport Number**: 123432343

        Should I proceed with these updates? (Yes/No)
        ```
2.  **Claude Chat Output:** "Please review the changes I'm about to make in the artifact. Should I proceed?"

**Step G: Execute Update**
1.  **User Input:** User confirms (e.g., "Yes," "Proceed").
2.  **Claude Action:**
    *   Use the `update_client` MCP tool.
    *   Pass the `client_id` and a dictionary containing only the confirmed field-value pairs to be updated.
3.  **Claude Chat Output:** Confirm success or report any errors from the `update_client` tool (e.g., "Client [Client Full Name] updated successfully," or "There was an error updating the client: [Error message from tool]").

**Step H: Handle Declined Update**
1.  **User Input:** User declines the proposed changes (e.g., "No," "Cancel").
2.  **Claude Chat Output:** "Okay, I won't make those changes. Would you like to specify different updates or cancel the update process?"

**Step I: Handle No Updates Provided**
1.  **User Input:** User responds to "What would you like to update?" without providing field changes (e.g., "nevermind," "no changes").
2.  **Claude Action:** Recognize no valid field-value pairs were parsed.
3.  **Claude Chat Output:** "Okay, no changes will be made to [Client Full Name]."