import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, MapPin, Plus, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface DashboardHeroSectionProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeroSection({ onRefresh, isRefreshing }: DashboardHeroSectionProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sri Lanka timezone
  const sriLankaTime = new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime);

  const sriLankaDate = new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(currentTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[hsl(250,80%,55%)] to-[hsl(280,70%,50%)] p-8 text-primary-foreground"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-[hsl(280,70%,60%)]/20 rounded-full blur-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20"
            >
              <BarChart3 className="w-8 h-8" />
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl lg:text-4xl font-bold"
              >
                Fleet Command Center
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-primary-foreground/80 text-lg"
              >
                Real-time insights into your fleet operations
              </motion.p>
            </div>
          </div>

          {/* Quick action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              onClick={() => navigate("/real-time-tracking")}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Live Tracking
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              onClick={() => navigate("/daily-trips")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Trip
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </motion.div>
        </div>

        {/* Right side - Time & Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          {/* Live Clock */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary-foreground/70" />
              <span className="text-sm text-primary-foreground/70">Sri Lanka Time</span>
            </div>
            <p className="text-2xl font-bold font-mono">{sriLankaTime}</p>
            <p className="text-sm text-primary-foreground/70">{sriLankaDate}</p>
          </div>

          {/* System Status */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2.5 h-2.5 bg-green-400 rounded-full"
              />
              <span className="text-sm font-medium">All Systems Online</span>
            </div>
            <p className="text-xs text-primary-foreground/60 mt-1">Last sync: Just now</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
