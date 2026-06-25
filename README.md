# Alf Mandalart Maker — Make Edition

> © All rights reserved D.H. Alf Bae, 2025. Produced by Dr.Alf.

A React/Vite app built with [Figma Make](https://www.figma.com/make) that turns any goal into a structured **9×9 Mandalart action plan** using your choice of LLM.

## Features

- **4-step wizard**: Goal input → Subgoal review → Action review → 9×9 visualization
- **Multi-LLM support**: Groq (free), OpenAI, Anthropic Claude, or built-in Mock
- **Interactive grid**: Click any cell in the 9×9 chart to edit inline
- **Export**: Download as TXT or print
- **Persistent settings**: API key and provider stored in `localStorage`

## Getting Started

```bash
pnpm install
pnpm build
```

## Banner Image Setup

The hero banner uses a cover image at:
```
src/imports/mandalart-cover.png
```

Place your `mandalart-cover.png` file in `src/imports/` before building.
The image is referenced in `src/app/App.tsx` as:
```ts
import bannerCover from "@/imports/mandalart-cover.png"
```

## LLM API Configuration

Click the **API Settings** button (gear icon) on any screen to choose a provider:

| Provider | Badge | Notes |
|---|---|---|
| Mock | Free | Fixed placeholder content, no API key needed |
| [Groq](https://console.groq.com) | Fast · Free tier | LLaMA 3.3 70B / 8B / Mixtral |
| [OpenAI](https://platform.openai.com) | GPT-4o | GPT-4o mini recommended |
| [Anthropic](https://console.anthropic.com) | Claude 3.5 | May have CORS limits in browser |

API keys are stored only in your browser's `localStorage` and are never sent anywhere except the chosen provider's API endpoint.

## Tech Stack

- React 18 + TypeScript
- Vite + Tailwind CSS v4
- Lucide React icons
- Fonts: Outfit (headings) + Inter (body) via Google Fonts

## Project Structure

```
src/
  app/
    App.tsx          # Full app — all steps + visualization
  imports/
    mandalart-cover.png  # Hero banner image (add manually)
  styles/
    fonts.css        # Google Fonts import
    theme.css        # Design tokens (indigo palette)
```
