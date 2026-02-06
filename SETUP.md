# Quick Setup Guide

## Step 1: Get Your Supabase Anon Key

1. Go to https://supabase.com/dashboard
2. Select your project: **sceonqnherqcapicgzxb**
3. Click **Settings** (bottom left sidebar)
4. Click **API**
5. Find **Project API keys** section
6. Copy the **`anon` `public`** key (long string starting with `eyJ...`)

## Step 2: Update config.js

Open `web/config.js` and replace:

```javascript
anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
```

With your actual key:

```javascript
anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZW9ucW5oZXJxY2FwaWNnenh...'
```

## Step 3: Enable Email Authentication in Supabase

### Enable Email Provider:
1. Go to **Authentication** → **Providers**
2. Find **Email** and make sure it's enabled (toggle should be green)

### Disable Email Confirmations (for testing):
1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Turn **OFF** "Enable email confirmations"
4. Click **Save**

### Create Test User:
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email**: `ambgavieres@mymail.mapua.edu.ph`
   - **Password**: `test123` (or your choice)
   - **Auto Confirm User**: ✓ (check this)
4. Click **Create user**

## Step 4: Set Up Row Level Security (RLS)

Your `users` table needs RLS policies so authenticated users can read their data:

1. Go to **Database** → **Tables** → `users`
2. Click **RLS** (Row Level Security)
3. Click **Enable RLS**
4. Click **New Policy**
5. Choose **"For full customization"**
6. Name: `Users can read own data`
7. Policy command: **SELECT**
8. Using expression:
```sql
auth.uid()::text = user_id
```
9. Click **Save**

**OR** run this SQL in the SQL Editor:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
```

## Step 5: Link Auth User to Database User

Your auth user email must match the `email_address` in your `users` table.

Check your users table:
```sql
SELECT user_id, email_address, given_name, last_name, role 
FROM users;
```

Make sure the email matches what you created in Step 3.

## Step 6: Run the Application

### Option A: Python HTTP Server
```bash
cd web
python -m http.server 8000
```
Open: http://localhost:8000/login.html

### Option B: Node.js HTTP Server
```bash
cd web
npx http-server -p 8000
```
Open: http://localhost:8000/login.html

### Option C: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `login.html`
3. Click "Open with Live Server"

## Step 7: Test Login

1. Open http://localhost:8000/login.html
2. Enter email: `ambgavieres@mymail.mapua.edu.ph`
3. Enter password: (what you set in Step 3)
4. Click **Login**
5. Should redirect to dashboard showing user info
6. Click **Logout** to return to login

## Troubleshooting

### "Missing anon key" error
- Make sure you updated `config.js` with your real anon key

### "Invalid login credentials"
- Check that the user exists in **Authentication → Users**
- Check email and password are correct
- Make sure "Auto Confirm User" was checked when creating

### "User not found in database"
- The auth email must match `email_address` in your `users` table
- Check with: `SELECT * FROM users WHERE email_address = 'ambgavieres@mymail.mapua.edu.ph';`

### CORS / Module errors
- You MUST use a local server (can't open HTML directly)
- Use one of the server options in Step 6

### "Row not found" or "403" errors
- Check RLS policies on the `users` table
- Make sure authenticated users can SELECT their own data

### Can't connect to Supabase
- Check that your project is not paused
- Check your internet connection
- Verify the project URL is correct in `config.js`

## Need Help?

1. Check browser console (F12) for error messages
2. Check Supabase logs: **Logs & Analytics** → **Logs Explorer**
3. Verify RLS policies are correct
4. Make sure auth user email matches database user email
