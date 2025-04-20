# Solana Watch Terminal

A terminal-style Solana wallet transaction tracker with real-time updates.

## Project info

**URL**: https://lovable.dev/projects/143731fc-993b-4d9b-b956-f7d85c2f3381

## Features

- Terminal-style UI for tracking Solana wallet transactions
- Real-time transaction updates via Solana's websocket API
- Connect your Solana wallet to add new wallets to track
- Persistent storage of tracked wallets using Supabase
- Community-based wallet tracking - see transactions from wallets added by any user

## Supabase Setup Instructions

This project uses Supabase for backend functionality. To set it up:

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Create a new table called `wallets` with the following schema:
   - `id` (int8, primary key)
   - `address` (text, not null)
   - `name` (text, not null)
   - `created_at` (timestamptz, default: now())
4. Add a unique constraint on the `address` column
5. Get your Supabase URL and anon key from the API settings
6. Update the values in `src/lib/supabase.ts`:
   ```js
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   const useLocalStorageFallback = false; // Set to false after configuring Supabase
   ```

**Note:** For demo purposes, the app uses localStorage to store wallets until Supabase is properly configured.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/143731fc-993b-4d9b-b956-f7d85c2f3381) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/143731fc-993b-4d9b-b956-f7d85c2f3381) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
