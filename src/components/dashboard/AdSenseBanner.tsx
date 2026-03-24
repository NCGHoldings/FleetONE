import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAdSense } from '@/hooks/useAdSense';
import { ADSENSE_PUBLISHER_ID, ADSENSE_AD_SLOTS } from '@/config/adsenseConfig';

interface AdSenseBannerProps {
    adSlot?: string;
    adFormat?: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
    className?: string;
}

/**
 * Non-intrusive AdSense banner component for the Dashboard.
 * 
 * - Only renders when ads are enabled AND user is not ad-free
 * - Includes a session-dismissible close button
 * - Handles ad-blocker scenarios gracefully (renders nothing)
 * - Styled to blend with the dashboard's design language
 */
export function AdSenseBanner({
    adSlot = ADSENSE_AD_SLOTS.dashboardBanner,
    adFormat = 'auto',
    className = ''
}: AdSenseBannerProps) {
    const { shouldShowAds, isAdScriptLoaded, scriptError } = useAdSense();
    const adRef = useRef<HTMLModElement>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [adPushed, setAdPushed] = useState(false);

    useEffect(() => {
        if (isAdScriptLoaded && adRef.current && !adPushed && !scriptError) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdPushed(true);
            } catch (e) {
                // Ad already pushed or ad-blocker active — silently ignore
                console.warn('[AdSense] Ad push failed:', e);
            }
        }
    }, [isAdScriptLoaded, adPushed, scriptError]);

    // Don't render if ads shouldn't show, dismissed, or script failed
    if (!shouldShowAds || isDismissed || scriptError) {
        return null;
    }

    return (
        <div
            className={`relative rounded-xl border border-white/10 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm overflow-hidden ${className}`}
            style={{ minHeight: '90px' }}
        >
            {/* Dismiss button */}
            <button
                onClick={() => setIsDismissed(true)}
                className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 transition-all duration-200"
                title="Dismiss ad for this session"
                aria-label="Close advertisement"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Sponsored label */}
            <div className="absolute top-2 left-3 z-10">
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                    Sponsored
                </span>
            </div>

            {/* AdSense ad unit */}
            <div className="flex items-center justify-center w-full pt-6 pb-3 px-3">
                <ins
                    ref={adRef}
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%' }}
                    data-ad-client={ADSENSE_PUBLISHER_ID}
                    data-ad-slot={adSlot}
                    data-ad-format={adFormat}
                    data-full-width-responsive="true"
                />
            </div>
        </div>
    );
}
