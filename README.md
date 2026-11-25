# CONTINUA LAB

**Intelligence Meets Imagination.** One studio. An entire creative team.

The private AI creative studio for LACASACONTINUA (furniture, surfaces and finishes, interior design).

## Status

Phase 2: application foundation. The visual identity (Direction A, *Atelier Milanese*), the navigation and the homepage are built. No integrations are connected yet. Rooms marked "Not built yet" are placeholders.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4 (design tokens in `src/index.css`)
- Motion and GSAP for animation
- Supabase (database, auth, storage, Edge Functions): coming next

## Run locally

```bash
npm install
npm run dev
```

## Secrets

Never commit API keys. The browser only ever sees the Supabase URL and publishable key (see `.env.example`). Claude, Grok, HeyGen and Canva keys live in Supabase Edge Function secrets.
