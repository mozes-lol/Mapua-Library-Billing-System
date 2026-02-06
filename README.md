# Library Billing System - Web Version

## Quick Start

See **SETUP.md** for detailed setup instructions.

## Setup Summary

### 1. Get Your Supabase Anon Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `sceonqnherqcapicgzxb`
3. Go to **Settings** → **API**
4. Copy the **anon public** key (starts with `eyJ...`)

### 2. Configure the App

Open `config.js` and replace:
```javascript
anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
```

With your actual anon key:
```javascript
anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### 3. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. Disable email confirmation (for testing):
   - Go to **Authentication** → **Settings**
   - Turn OFF "Enable email confirmations"

### 4. Create Auth Users

For each user in your `users` table, create an auth account:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: Same as `email_address` in your users table
   - Password: Same password you want them to use
4. Click **Create user**

**OR** use SQL to create auth users:

```sql
-- Create auth user for Anna Mikaela
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'ambgavieres@mymail.mapua.edu.ph',
  crypt('yourpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

### 5. Run the Application

**Option A: Simple HTTP Server (Python)**
```bash
cd web
python -m http.server 8000
```
Then open: http://localhost:8000/login.html

**Option B: Simple HTTP Server (Node.js)**
```bash
cd web
npx http-server -p 8000
```
Then open: http://localhost:8000/login.html

**Option C: VS Code Live Server**
1. Install "Live Server" extension in VS Code
2. Right-click on `login.html`
3. Select "Open with Live Server"

### 6. Test Login

1. Open `login.html` in your browser
2. Enter email: `ambgavieres@mymail.mapua.edu.ph`
3. Enter the password you set in Supabase Auth
4. Click Login
5. You should see the dashboard with user info

## How It Works

1. **Login Flow:**
   - User enters email and password
   - `supabase.auth.signInWithPassword()` authenticates with Supabase Auth
   - App fetches user details from `users` table
   - Stores user info in localStorage
   - Redirects to dashboard

2. **Dashboard:**
   - Reads user info from localStorage
   - Displays user details
   - Logout button clears session and redirects to login

3. **Security:**
   - Uses Supabase Auth for authentication
   - No passwords stored in localStorage
   - Session managed by Supabase

## Troubleshooting

**Error: "Invalid login credentials"**
- Make sure the user exists in Supabase Auth (not just users table)
- Check that email and password are correct

**Error: "Missing anon key"**
- Replace `YOUR_SUPABASE_ANON_KEY_HERE` in `app.js` with your actual key

**Page won't load / CORS error**
- You MUST use a local server (can't open HTML file directly)
- Use one of the server options above

**Can't fetch user data**
- Check Row Level Security policies on `users` table
- Make sure authenticated users can read their own data
