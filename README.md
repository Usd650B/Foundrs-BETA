# Foundrs - Modern Web Application

A modern web application built with React, TypeScript, and Vite, featuring a clean architecture and responsive design.

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later) or yarn

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   cd foundrs
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Building for Production

```sh
npm run build
```

This will create a production-ready build in the `dist` directory.

## Project Structure

## Project Structure

```
/src
├── components/    # Reusable UI components
├── pages/         # Application pages and routes
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── integrations/  # Third-party service integrations
└── assets/        # Static assets like images and fonts
```

## Tech Stack

- ⚡ [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- ⚛️ [React 18](https://reactjs.org/) - A JavaScript library for building user interfaces
- 🎨 [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- 📦 [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- 🔄 [TanStack Query](https://tanstack.com/query) - Data fetching and state management
- 🔒 [Supabase](https://supabase.com/) - Backend services (auth, database, storage)

## Deployment

This project can be deployed to any static hosting service that supports modern JavaScript applications:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [GitHub Pages](https://pages.github.com/)

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)
