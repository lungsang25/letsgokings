import { AppProvider, useApp } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';
import { Crown } from 'lucide-react';

const AppContent = () => {
  const { currentUser, isLoading } = useApp();
  
  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex flex-col items-center justify-center">
        <Crown className="h-12 w-12 text-yellow-400 animate-pulse mb-4" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }
  
  return currentUser ? <Dashboard /> : <LoginPage />;
};

const Index = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default Index;
