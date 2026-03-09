

# Fix Garage One URL

## Problem
Garage One at `https://garageone.ncg.lk` blocks iframe embedding via security headers. The staging URL `https://staging.garageone.ncg.lk/login` allows it.

## Change — `src/components/layout/AppSidebar.tsx`
Line 390: Replace the URL from `https://garageone.ncg.lk` to `https://staging.garageone.ncg.lk/login`.

