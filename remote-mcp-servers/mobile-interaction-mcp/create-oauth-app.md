# Create New Gmail OAuth Application

## Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

## Step 2: Create/Select Project
- Create a new project or select existing one
- Name it something like "Travel Agent Gmail Integration"

## Step 3: Enable Gmail API
- Go to "APIs & Services" > "Library"
- Search for "Gmail API"
- Click on it and press "Enable"

## Step 4: Create OAuth Consent Screen
- Go to "APIs & Services" > "OAuth consent screen"
- Choose "External" user type
- Fill in required fields:
  - App name: "Travel Agent Gmail Integration"
  - User support email: your email
  - Developer contact email: your email
- Add scopes:
  - https://www.googleapis.com/auth/gmail.readonly
  - https://www.googleapis.com/auth/gmail.modify
- Add your email as a test user

## Step 5: Create OAuth Client ID
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth client ID"
- Choose "Web application"
- Name: "Travel Agent MCP"
- Authorized redirect URIs:
  - https://developers.google.com/oauthplayground
  - http://localhost:8080
  - urn:ietf:wg:oauth:2.0:oob

## Step 6: Get Your Credentials
- Copy the Client ID and Client Secret
- Use these in the OAuth process

## Step 7: Test with OAuth Playground
- Go to https://developers.google.com/oauthplayground/
- Use your NEW credentials
- Select Gmail scopes
- Authorize and get tokens