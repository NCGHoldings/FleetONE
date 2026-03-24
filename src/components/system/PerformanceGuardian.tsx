/**
 * Performance Guardian Component
 *
 * Unified health dashboard for the entire system:
 * - System Health Score (A-F grade)
 * - Cross-Module Integrity Matrix
 * - Performance Metrics
 * - Auto-Fix Actions
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    usePerformanceGuardian,
    type HealthGrade,
} from '@/hooks/usePerformanceGuardian';
import {
    Shield, Activity, CheckCircle, AlertTriangle, XCircle,
    RefreshCw, Zap, Clock, HardDrive, Wifi, Loader2,
    TrendingUp, BarChart3, ArrowRight,
} from 'lucide-react';

const gradeDescriptions: Record<HealthGrade, string> = {
    A: 'Excellent — all systems healthy',
    B: 'Good — minor warnings to address',
    C: 'Fair — several issues need attention',
    D: 'Poor — critical issues detected',
    F: 'Critical — immediate action required',
};

export function PerformanceGuardian() {
    const { summary, isRunning, runFullScan, getGradeColor, getGradeBgColor } = usePerformanceGuardian();

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Shield className="h-5 w-5 text-primary" />
                                </div>
                                Performance Guardian
                            </CardTitle>
                            <Button
                                onClick={runFullScan}
                                disabled={isRunning}
                                size="sm"
                                className="gap-2"
                            >
                                {isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                {isRunning ? 'Scanning...' : 'Run Full Scan'}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Real-time system health monitoring — checks GL integrity, module automation, cross-module consistency, and app performance
                        </p>
                    </CardHeader>
                </Card>

                {!summary ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                                <Shield className="h-12 w-12 text-muted-foreground opacity-50" />
                            </div>
                            <p className="font-medium text-muted-foreground text-lg">No Scan Results Yet</p>
                            <p className="text-sm text-muted-foreground mt-2 mb-6">
                                Click "Run Full Scan" to check system health across all modules
                            </p>
                            <Button onClick={runFullScan} disabled={isRunning} className="gap-2">
                                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                                {isRunning ? 'Scanning System...' : 'Start System Scan'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Score + Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Grade Card */}
                            <Card className={`md:col-span-1 border-2 ${getGradeBgColor(summary.grade)}`}>
                                <CardContent className="p-6 text-center">
                                    <div className={`text-6xl font-black ${getGradeColor(summary.grade)}`}>
                                        {summary.grade}
                                    </div>
                                    <div className="text-3xl font-bold mt-1">{summary.overallScore}%</div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {gradeDescriptions[summary.grade]}
                                    </p>
                                    {summary.lastRunTime && (
                                        <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {summary.lastRunTime.toLocaleTimeString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Stats Cards */}
                            <Card className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{summary.passedChecks}</div>
                                            <div className="text-xs text-muted-foreground">Passed Checks</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.warningChecks}</div>
                                            <div className="text-xs text-muted-foreground">Warnings</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 border-red-200/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.errorChecks}</div>
                                            <div className="text-xs text-muted-foreground">Critical Errors</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                            <BarChart3 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{summary.totalChecks}</div>
                                            <div className="text-xs text-muted-foreground">Total Checks</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Score Progress Bar */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">System Health</span>
                                    <span className={`text-sm font-bold ${getGradeColor(summary.grade)}`}>{summary.overallScore}%</span>
                                </div>
                                <Progress value={summary.overallScore} className="h-3" />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Cross-Module Integrity Matrix */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Cross-Module Integrity Matrix
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                {summary.totalChecks} checks
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {summary.crossModuleResults.map((result) => (
                                            <div
                                                key={result.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${result.status === 'error' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                                                        result.status === 'warning' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' :
                                                            'bg-emerald-50/30 border-emerald-200/50 dark:bg-emerald-950/10 dark:border-emerald-800/50'
                                                    }`}
                                            >
                                                <div className="shrink-0">
                                                    {result.status === 'error' ? (
                                                        <XCircle className="h-5 w-5 text-red-500" />
                                                    ) : result.status === 'warning' ? (
                                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                    ) : (
                                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium">{result.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{result.message}</div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {result.modules.map(m => (
                                                        <Badge key={m} variant="outline" className="text-xs whitespace-nowrap">{m}</Badge>
                                                    ))}
                                                    {result.count > 0 && (
                                                        <Badge variant={result.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                                                            {result.count}
                                                        </Badge>
                                                    )}
                                                    {result.action && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => window.location.href = result.action!.path}
                                                                >
                                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{result.action.label}</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Performance Metrics */}
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Zap className="h-4 w-4" />
                                            App Performance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                Page Load
                                            </div>
                                            <Badge variant={summary.performanceMetrics.pageLoadTime < 3000 ? 'default' : 'destructive'}>
                                                {summary.performanceMetrics.pageLoadTime}ms
                                            </Badge>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                                DOM Ready
                                            </div>
                                            <Badge variant="secondary">
                                                {summary.performanceMetrics.domContentLoaded}ms
                                            </Badge>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Zap className="h-4 w-4 text-muted-foreground" />
                                                First Paint
                                            </div>
                                            <Badge variant={summary.performanceMetrics.firstContentfulPaint < 2000 ? 'default' : 'destructive'}>
                                                {summary.performanceMetrics.firstContentfulPaint}ms
                                            </Badge>
                                        </div>
                                        {summary.performanceMetrics.memoryUsageMB !== null && (
                                            <>
                                                <Separator />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                                                        Memory
                                                    </div>
                                                    <Badge variant={summary.performanceMetrics.memoryUsageMB < 200 ? 'default' : 'destructive'}>
                                                        {summary.performanceMetrics.memoryUsageMB} MB
                                                    </Badge>
                                                </div>
                                            </>
                                        )}
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Wifi className="h-4 w-4 text-muted-foreground" />
                                                Connection
                                            </div>
                                            <Badge variant="outline">
                                                {summary.performanceMetrics.connectionType}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Quick Actions */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Activity className="h-4 w-4" />
                                            Quick Actions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 text-sm"
                                            onClick={runFullScan}
                                            disabled={isRunning}
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                                            Re-run All Checks
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 text-sm"
                                            onClick={() => window.location.href = '/accounting'}
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Open GL Scanner
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 text-sm"
                                            onClick={() => window.location.href = '/system-issues'}
                                        >
                                            <Shield className="h-4 w-4" />
                                            System Issue Tracker
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
