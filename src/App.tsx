import { useState, useEffect } from 'react';
import { LedgerProvider } from './context/LedgerContext';
import {
  Onboarding,
  Dashboard,
  TransactionRegister,
  PeopleList,
  StockDashboard,
  Settings,
  Layout
} from './components';

function AppContent() {
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simple router state
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks'>('dashboard');

  useEffect(() => {
    const user = localStorage.getItem('ledger_user_name');
    if (user) {
      setHasProfile(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) return null;

  if (!hasProfile) {
    return <Onboarding onComplete={() => setHasProfile(true)} />;
  }

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
      {currentView === 'transactions' && <TransactionRegister />}
      {currentView === 'stocks' && <StockDashboard />}
      {currentView === 'people' && <PeopleList />}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

function App() {
  return (
    <LedgerProvider>
      <AppContent />
    </LedgerProvider>
  )
}

export default App
