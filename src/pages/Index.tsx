import { AppProvider, useApp } from '@/contexts/AppContext';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

const AppContent = () => {
  const { currentUser } = useApp();
  
  return currentUser ? <Dashboard /> : <LoginPage />;
};

const Index = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default Index;
