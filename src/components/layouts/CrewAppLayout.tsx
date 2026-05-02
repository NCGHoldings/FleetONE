import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Home, Clock, CalendarDays, User } from 'lucide-react';
import { useCrewAuth } from '@/contexts/CrewAuthContext';

export default function CrewAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useCrewAuth();

  // If not authenticated, redirect to the crew login page
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/public/crew-login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  const tabs = [
    { name: 'Upload', path: '/public/crew/upload', icon: Home },
    { name: 'History', path: '/public/crew/history', icon: Clock },
    { name: 'Schedule', path: '/public/crew/schedule', icon: CalendarDays },
    { name: 'Profile', path: '/public/crew/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
                             (tab.path === '/public/crew/upload' && location.pathname === '/public/crew');
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'fill-blue-50' : ''}`} />
                <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
