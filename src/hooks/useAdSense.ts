import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADS_ENABLED, AD_FREE_ROLES, ADSENSE_SCRIPT_URL } from '@/config/adsenseConfig';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

/**
 * Hook to manage Google AdSense loading and role-based ad visibility.
 * 
 * - Ads are only shown when ADS_ENABLED is true in config
 * - Users with admin/supervisor roles never see ads
 * - Script is lazy-loaded only when ads should be displayed
 */
export function useAdSense() {
    const { userRoles } = useAuth();
    const [isAdScriptLoaded, setIsAdScriptLoaded] = useState(false);
    const [scriptError, setScriptError] = useState(false);

    // Check if the current user should see ads
    const isAdFreeUser = userRoles.some(role =>
        (AD_FREE_ROLES as readonly string[]).includes(role)
    );

    const shouldShowAds = ADS_ENABLED && !isAdFreeUser;

    // Lazy-load the AdSense script only when needed
    const loadAdScript = useCallback(() => {
        if (!shouldShowAds) return;

        // Don't load if already present
        const existingScript = document.querySelector(
            `script[src*="pagead2.googlesyndication.com"]`
        );

        if (existingScript) {
            setIsAdScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = ADSENSE_SCRIPT_URL;
        script.async = true;
        script.crossOrigin = 'anonymous';

        script.onload = () => {
            setIsAdScriptLoaded(true);
        };

        script.onerror = () => {
            // Ad blocker likely — fail silently
            setScriptError(true);
            console.warn('[AdSense] Script failed to load (ad blocker may be active)');
        };

        document.head.appendChild(script);
    }, [shouldShowAds]);

    useEffect(() => {
        if (shouldShowAds) {
            loadAdScript();
        }
    }, [shouldShowAds, loadAdScript]);

    return {
        shouldShowAds,
        isAdScriptLoaded,
        scriptError,
        isAdFreeUser,
        adsEnabled: ADS_ENABLED,
    };
}
