# React Admin Panel (Supabase, shadcn/ui, Tailwind, TypeScript)

## Features
- React + TypeScript + Vite
- Tailwind CSS (dark mode via class strategy)
- shadcn/ui components (Button, Card, Dialog, Table, etc.)
- Supabase authentication and CRUD
- React Query for data fetching
- Protected admin routes
- Responsive sidebar, header, theme toggle

## Folder Structure
```
src/
├── assets/
├── components/
│    ├── ui/
│    └── common/
├── context/
├── hooks/
├── layouts/
├── pages/
├── services/
├── types/
├── utils/
├── App.tsx
├── main.tsx
└── tailwind.config.js
```

## Setup Instructions

### 1. Install dependencies
```
npm install
```

### 2. Configure Tailwind CSS
- Already set up in `tailwind.config.js` and `postcss.config.js`.
- Dark mode enabled via `class` strategy.

### 3. Set up Supabase
- Create a project at [supabase.com](https://supabase.com/)
- Get your project URL and anon key.
- Add to `.env`:
  ```
  VITE_SUPABASE_URL=your-supabase-url
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```
- Create tables: `users`, `services`, `orders`, etc. (see `/types` for schema)

### 4. Run the app
```
npm run dev
```

### 5. Test the app
- Login as an admin (role 'admin' required for protected routes)
- Try CRUD on Users, Services, Orders, etc.
- Toggle dark/light mode

## Notes
- Uses React Query for data fetching and optimistic updates.
- Uses shadcn/ui for all UI primitives.
- All routes except `/login` are protected for admin users.
- Add more modules/pages as needed!
