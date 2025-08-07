# Install Supabase CLI

## Method 1: NPM (Recommended - Works on all platforms)

```bash
npm install -g supabase
```

## Method 2: Platform-Specific Installers

### macOS
```bash
# Using Homebrew
brew install supabase/tap/supabase

# Or using MacPorts
sudo port install supabase
```

### Windows
```bash
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using Chocolatey
choco install supabase
```

### Linux
```bash
# Download and install directly
curl -fsSL https://supabase.com/install.sh | sh

# Or using Homebrew on Linux
brew install supabase/tap/supabase
```

## Verify Installation

After installation, verify it works:

```bash
supabase --version
```

You should see something like: `supabase version 1.x.x`

## Next Steps After Installation

1. **Login to Supabase**:
   ```bash
   supabase login
   ```

2. **Link your project** (run this in your summarease folder):
   ```bash
   supabase link --project-ref your-project-id
   ```
   
   Your project ID is the part before `.supabase.co` in your project URL.
   For example, if your URL is `https://YOUR_PROJECT_REF.supabase.co`, 
   your project ID is `YOUR_PROJECT_REF`.

3. **Set environment variables for Edge Functions**:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here
   ```

4. **Deploy the process-file function**:
   ```bash
   supabase functions deploy process-file
   ```

## Troubleshooting

### Permission Issues (macOS/Linux)
If you get permission errors with npm:
```bash
sudo npm install -g supabase
```

### Path Issues
If the command isn't found after installation, you may need to restart your terminal or add to PATH.

### Alternative: Use npx (No Installation Required)
If you prefer not to install globally:
```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase secrets set GEMINI_API_KEY=your-key
npx supabase functions deploy process-file
```

## Ready to Deploy!

Once installed, you'll be able to deploy the AI processing function and complete Phase 2! 🚀