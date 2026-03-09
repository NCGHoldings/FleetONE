

# Add Dark Theme Toggle to the System

## Current State
- Dark theme CSS variables are **already fully defined** in `src/index.css` (`.dark` class, lines 85-148)
- Tailwind is configured with `darkMode: ["class"]`
- `next-themes` package is already installed
- `useTheme` from `next-themes` is already used in `src/components/ui/sonner.tsx`
- But there is **no `ThemeProvider` from `next-themes`** wrapping the app, and **no toggle button** anywhere in the UI

## Plan

### 1. Wrap App with `next-themes` ThemeProvider (`src/App.tsx`)
- Import `ThemeProvider` from `next-themes`
- Wrap the app content with `<ThemeProvider attribute="class" defaultTheme="light" storageKey="ncg-theme">`

### 2. Create Dark Mode Toggle Component (`src/components/layout/DarkModeToggle.tsx`)
- Simple button with Sun/Moon icons from Lucide
- Uses `useTheme()` from `next-themes` to toggle between light/dark
- Animated icon swap

### 3. Add Toggle to Header (`src/components/layout/Header.tsx`)
- Place the `DarkModeToggle` next to the notification bell in the header bar

