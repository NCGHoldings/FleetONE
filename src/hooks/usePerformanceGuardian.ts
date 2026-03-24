/**
 * Performance Guardian Hook
 *
 * Unified orchestrator combining all system health checks:
 * - GL Integrity Scanner (gap detection)
 * - Finance Automation Engine (recurring entries, balance checks)
 * - Cross-Module Integrity Checks (17 operational + finance checks)
 * - Client-Side Performance Metrics (Navigation Timing API)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCrossModuleChecks, type CrossModuleResult } from '@/hooks/useCrossModuleChecks';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface PerformanceMetrics {
    pageLoadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    memoryUsageMB: number | null;
    connectionType: string;
}

export interface GuardianSummary {
    overallScore: number;
    grade: HealthGrade;
    totalChecks: number;
    passedChecks: number;
    warningChecks: number;
    errorChecks: number;
    lastRunTime: Date | null;
    performanceMetrics: PerformanceMetrics;
    crossModuleResults: CrossModuleResult[];
    isRunning: boolean;
}

const calculateGrade = (score: number): HealthGrade => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
};

const getGradeColor = (grade: HealthGrade): string => {
    switch (grade) {
        case 'A': return 'text-emerald-600';
        case 'B': return 'text-blue-600';
        case 'C': return 'text-amber-600';
        case 'D': return 'text-orange-600';
        case 'F': return 'text-red-600';
    }
};

const getGradeBgColor = (grade: HealthGrade): string => {
    switch (grade) {
        case 'A': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800';
        case 'B': return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800';
        case 'C': return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
        case 'D': return 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800';
        case 'F': return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
    }
};

function collectPerformanceMetrics(): PerformanceMetrics {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

    let fcp = 0;
    try {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;
    } catch { /* not available */ }

    let memoryMB: number | null = null;
    try {
        const mem = (performance as any).memory;
        if (mem) {
            memoryMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
        }
    } catch { /* not available */ }

    let connectionType = 'unknown';
    try {
        const conn = (navigator as any).connection;
        if (conn) {
            connectionType = conn.effectiveType || conn.type || 'unknown';
        }
    } catch { /* not available */ }

    return {
        pageLoadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
        firstContentfulPaint: fcp,
        memoryUsageMB: memoryMB,
        connectionType,
    };
}

export const usePerformanceGuardian = () => {
    const crossModule = useCrossModuleChecks();
    const [summary, setSummary] = useState<GuardianSummary | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const runCountRef = useRef(0);

    const runFullScan = useCallback(async () => {
        setIsRunning(true);
        runCountRef.current += 1;

        // Run cross-module checks
        await crossModule.runAllChecks();

        // Collect performance metrics
        const perfMetrics = collectPerformanceMetrics();

        // Calculate score: each check contributes equally
        const results = crossModule.results;
        const totalChecks = results.length || 1;
        const passedChecks = results.filter(r => r.status === 'success').length;
        const warningChecks = results.filter(r => r.status === 'warning').length;
        const errorChecks = results.filter(r => r.status === 'error').length;

        // Score: success = full points, warning = half, error = 0
        const rawScore = ((passedChecks * 1 + warningChecks * 0.5) / totalChecks) * 100;
        const overallScore = Math.round(Math.min(100, Math.max(0, rawScore)));

        setSummary({
            overallScore,
            grade: calculateGrade(overallScore),
            totalChecks,
            passedChecks,
            warningChecks,
            errorChecks,
            lastRunTime: new Date(),
            performanceMetrics: perfMetrics,
            crossModuleResults: results,
            isRunning: false,
        });

        setIsRunning(false);
    }, [crossModule]);

    // Re-sync summary when cross-module results update
    useEffect(() => {
        if (crossModule.results.length > 0 && crossModule.lastRunTime) {
            const results = crossModule.results;
            const totalChecks = results.length;
            const passedChecks = results.filter(r => r.status === 'success').length;
            const warningChecks = results.filter(r => r.status === 'warning').length;
            const errorChecks = results.filter(r => r.status === 'error').length;
            const rawScore = ((passedChecks * 1 + warningChecks * 0.5) / totalChecks) * 100;
            const overallScore = Math.round(Math.min(100, Math.max(0, rawScore)));

            setSummary(prev => ({
                overallScore,
                grade: calculateGrade(overallScore),
                totalChecks,
                passedChecks,
                warningChecks,
                errorChecks,
                lastRunTime: crossModule.lastRunTime,
                performanceMetrics: prev?.performanceMetrics || collectPerformanceMetrics(),
                crossModuleResults: results,
                isRunning: false,
            }));
        }
    }, [crossModule.results, crossModule.lastRunTime]);

    return {
        summary,
        isRunning: isRunning || crossModule.isRunning,
        runFullScan,
        getGradeColor,
        getGradeBgColor,
    };
};
