/**
 * Google AdSense Configuration
 * 
 * Set ADS_ENABLED to true when you're ready to show ads.
 * Replace ADSENSE_PUBLISHER_ID with your real publisher ID from Google AdSense.
 */

// ═══════════════════════════════════════════════════════════
//  🔴 MASTER KILL SWITCH — Set to true to activate ads
// ═══════════════════════════════════════════════════════════
export const ADS_ENABLED = false;

// Your Google AdSense Publisher ID (get from https://www.google.com/adsense/)
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXX';

// Ad slot IDs — replace with real slot IDs from your AdSense dashboard
export const ADSENSE_AD_SLOTS = {
    dashboardBanner: '1234567890',  // Horizontal banner between charts and alerts
} as const;

// Roles that should NEVER see ads (premium/admin users)
export const AD_FREE_ROLES = [
    'super_admin',
    'admin',
    'supervisor',
] as const;

// AdSense script URL
export const ADSENSE_SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
