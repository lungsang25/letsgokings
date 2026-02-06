import { AppProvider, useApp } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

const AppContent = () => {
  const { currentUser } = useApp();
  
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
