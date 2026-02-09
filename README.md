# Sat-Brain 🧠

> An AI-powered study assistant that transforms documents into interactive learning materials including summaries, quizzes, flashcards, and visualizations.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Isaac-1555/project_goldmine)

## ✨ Features

- 📄 **Document Processing**: Upload PDFs, Word documents, and more
- 🤖 **AI Summaries**: Generate intelligent summaries using Google Gemini
- 📊 **Auto-Generated Charts**: Visualize data with Vega-Lite charts
- ❓ **Quiz Generation**: Create quizzes from your content
- 🎴 **Flashcards**: Generate study flashcards automatically
- 🎙️ **Audio Transcription**: Convert audio to text
- 🔍 **Advanced Search**: Find content by tags and filenames

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account
- Google Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Isaac-1555/project_goldmine.git
   cd project_goldmine/summarease
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (see ENV_SETUP.md)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 📚 Documentation

- **[Deployment Guide](../DEPLOYMENT.md)** - Complete Vercel deployment instructions
- **[Environment Setup](../ENV_SETUP.md)** - Environment variables configuration
- **[API Documentation](#)** - Coming soon

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI + Custom Components
- **State Management**: React Hooks
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **AI**: Google Gemini API
- **Charts**: Vega-Lite, D3.js, Recharts
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 📊 Charts Panel (Auto-Suggested Infographics)

### Overview
- **Location**: ContentViewer summary tab - Charts section under summary text
- **How it works**: Frontend parses summaries to detect chartable patterns (numbers, percentages, years) and recommends appropriate visualizations
- **Technology**: Vega-Lite via vega-embed with PNG/SVG export
- **Persistence**: Chart selections stored locally per summary

### Developer Notes
- **Code**: `src/lib/viz/*` for extraction/templates; `src/components/Charts/*` for UI
- **Styling**: `src/components/Charts/Charts.css`
- **Customization**: Add templates or modify defaults in `vegaTemplates.ts`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

- All PRs automatically get preview deployments
- CI checks run on every PR (linting, type checking, build)
- Production deploys automatically on merge to `main`

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run export:brand # Export brand assets
```

## 🔐 Environment Variables

See [ENV_SETUP.md](../ENV_SETUP.md) for detailed configuration.

Required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_FEEDBACK_EMAIL`

## 🗄️ Database

### Migrations

Database migrations are located in `supabase/migrations/`. Run them in order:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually through Supabase dashboard SQL editor
```

### Schema Overview

- `documents` - Uploaded documents
- `summaries` - AI-generated summaries
- `quizzes` - Quiz data and questions
- `flashcards` - Study flashcards
- `transcripts` - Audio transcriptions
- `tags` - Content categorization

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Connect Repository**
   - Import project in Vercel dashboard
   - Set root directory to `summarease`

2. **Configure Settings**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Add Environment Variables**
   - See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete guide

### CI/CD Pipeline

- ✅ Automated testing on PRs
- ✅ Preview deployments for every PR
- ✅ Production deployment on merge to main
- ✅ Automatic rollback capability

## 🐛 Troubleshooting

### Build Issues
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Loading
- Ensure variables start with `VITE_`
- Restart dev server after changes
- Clear Vite cache: `rm -rf node_modules/.vite`

### Supabase Connection Issues
- Verify RLS policies
- Check CORS settings
- Confirm anon key permissions

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Supabase](https://supabase.com/)
- AI by [Google Gemini](https://ai.google.dev/)
- Deployed on [Vercel](https://vercel.com/)

---

**For detailed deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)**
