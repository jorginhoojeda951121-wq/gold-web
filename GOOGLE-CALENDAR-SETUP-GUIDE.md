# Google Calendar API Setup Guide 📅

This guide will walk you through setting up Google Calendar API integration for your Gold POS system.

---

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter project name: `Gold POS Calendar` (or any name you prefer)
   - Click **"Create"**
   - Wait for the project to be created (usually takes a few seconds)

3. **Select Your Project**
   - Click the project dropdown again
   - Select the project you just created

---

## Step 2: Enable Google Calendar API

1. **Navigate to APIs & Services**
   - In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or go directly to: https://console.cloud.google.com/apis/library

2. **Search for Calendar API**
   - In the search bar, type: `Google Calendar API`
   - Click on **"Google Calendar API"** from the results

3. **Enable the API**
   - Click the **"Enable"** button
   - Wait for it to enable (usually instant)

---

## Step 3: Create OAuth 2.0 Credentials (Client ID)

1. **Go to Credentials Page**
   - In the left sidebar, click **"APIs & Services"** → **"Credentials"**
   - Or go directly to: https://console.cloud.google.com/apis/credentials

2. **Configure OAuth Consent Screen** (First Time Only)
   - Click **"OAuth consent screen"** tab
   - Select **"External"** (unless you have a Google Workspace account)
   - Click **"Create"**
   
   **Fill in the required information:**
   - **App name**: `Gold POS System` (or your business name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
   - Click **"Save and Continue"**
   
   **Scopes (Step 2):**
   - Click **"Add or Remove Scopes"**
   - Search for: `https://www.googleapis.com/auth/calendar.events`
   - Check the box next to it
   - Click **"Update"**
   - Click **"Save and Continue"**
   
   **Test Users (Step 3):**
   - Add your email address as a test user
   - Click **"Save and Continue"**
   - Click **"Back to Dashboard"**

3. **Create OAuth 2.0 Client ID**
   - Go back to **"Credentials"** tab
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"OAuth client ID"**
   
   **Application Type:**
   - Select **"Web application"**
   
   **Name:**
   - Enter: `Gold POS Web Client`
   
   **Authorized JavaScript origins:**
   - Click **"+ ADD URI"**
   - Add: `http://localhost:8080` (for development)
   - Add: `http://localhost:5173` (if using Vite default port)
   - Add your production domain if you have one (e.g., `https://yourdomain.com`)
   
   **Authorized redirect URIs:**
   - Click **"+ ADD URI"**
   - Add: `http://localhost:8080` (for development)
   - Add: `http://localhost:5173` (if using Vite default port)
   - Add your production domain if you have one
   
   - Click **"Create"**
   
4. **Copy Your Client ID**
   - A popup will appear with your **Client ID** and **Client Secret**
   - **Copy the Client ID** (you'll need this)
   - You can also copy the Client Secret if needed (but we only need Client ID for this integration)
   - Click **"OK"**

---

## Step 4: Create API Key

1. **Create API Key**
   - Still on the **"Credentials"** page
   - Click **"+ CREATE CREDENTIALS"** again
   - Select **"API key"**
   
2. **Restrict API Key (Recommended for Production)**
   - A popup will show your API key
   - **Copy the API key** first (save it somewhere safe)
   - Click **"Restrict key"** (recommended for security)
   
   **Application restrictions:**
   - Select **"HTTP referrers (web sites)"**
   - Click **"+ ADD AN ITEM"**
   - Add: `http://localhost:8080/*` (for development)
   - Add: `http://localhost:5173/*` (if using Vite default port)
   - Add your production domain if you have one (e.g., `https://yourdomain.com/*`)
   
   **API restrictions:**
   - Select **"Restrict key"**
   - Check **"Google Calendar API"**
   - Click **"Save"**

---

## Step 5: Configure Your Application

1. **Create/Edit `.env` File**
   - In your project root directory (`gold-web`), create or edit the `.env` file
   - If the file doesn't exist, create it

2. **Add Your Keys**
   ```env
   # Google Calendar API Configuration
   VITE_GOOGLE_CALENDAR_API_KEY=your_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```

   **Replace:**
   - `your_api_key_here` with the API Key you copied in Step 4
   - `your_client_id_here` with the Client ID you copied in Step 3

   **Example:**
   ```env
   VITE_GOOGLE_CALENDAR_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```

3. **Restart Your Development Server**
   - Stop your current dev server (Ctrl+C)
   - Start it again: `npm run dev`
   - Environment variables are loaded when the server starts

---

## Step 6: Test the Integration

1. **Open Your Application**
   - Go to the **Reservations** page
   - Scroll to the bottom to see the **"Google Calendar Integration"** section

2. **Connect Google Calendar**
   - Click **"Connect Google Calendar"** button
   - A Google sign-in popup will appear
   - Sign in with your Google account
   - Grant permissions to access your calendar
   - You should see "Connected" status

3. **Test Creating a Reservation**
   - Create a new reservation
   - It should automatically sync to your Google Calendar!

---

## Troubleshooting

### ❌ "API keys not configured" message
- **Solution**: Make sure your `.env` file is in the project root
- Make sure variable names start with `VITE_`
- Restart your dev server after adding keys

### ❌ "Failed to load Google API"
- **Solution**: Check your internet connection
- Make sure you're not blocking Google APIs with an ad blocker

### ❌ "OAuth consent screen" errors
- **Solution**: Make sure you completed the OAuth consent screen setup
- Add your email as a test user
- Wait a few minutes for changes to propagate

### ❌ "Redirect URI mismatch"
- **Solution**: Make sure your redirect URI in Google Cloud Console matches your app URL
- For localhost, use: `http://localhost:8080` or `http://localhost:5173`
- Check the exact port your dev server is using

### ❌ API Key restrictions too strict
- **Solution**: Temporarily remove API restrictions to test
- Add restrictions back after confirming it works

---

## Security Best Practices 🔒

1. **Never commit `.env` to Git**
   - Make sure `.env` is in your `.gitignore` file
   - Use environment variables in production

2. **Restrict API Keys**
   - Always restrict API keys to specific domains
   - Only allow the Google Calendar API

3. **Use Different Keys for Production**
   - Create separate API keys for production
   - Use different OAuth client IDs for production

4. **Monitor API Usage**
   - Check Google Cloud Console regularly
   - Set up billing alerts if needed

---

## Production Deployment

For production, you'll need to:

1. **Update OAuth Consent Screen**
   - Submit for verification (if using external users)
   - Or use a Google Workspace account (internal users)

2. **Update Authorized Origins**
   - Add your production domain
   - Remove localhost URLs (or keep for testing)

3. **Set Environment Variables**
   - Use your hosting platform's environment variable settings
   - Never hardcode keys in your code

---

## Quick Reference

**Where to find your keys:**
- **Client ID**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- **API Key**: Google Cloud Console → APIs & Services → Credentials → API Keys

**Required Scopes:**
- `https://www.googleapis.com/auth/calendar.events`

**Required APIs:**
- Google Calendar API

---

## Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your keys are correct in `.env`
3. Make sure you restarted the dev server
4. Check Google Cloud Console for any error messages

---

*Last Updated: 2025-11-13*

