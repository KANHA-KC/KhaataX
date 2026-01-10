import { useState, useEffect } from 'react';
import { LedgerProvider } from './context/LedgerContext';
import { LanguageProvider } from './context/LanguageContext';
import { licenseService } from './services/license';
import {
  Onboarding,
  Dashboard,
  TransactionRegister,
  PeopleList,
  StockDashboard,
  Settings,
  Layout,
  LockScreen,
  ActivationScreen
} from './components';

function AppContent() {
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [isActivated, setIsActivated] = useState(true);
  const [isTauri, setIsTauri] = useState(false);

  // Simple router state
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks'>('dashboard');

  useEffect(() => {
    const initApp = async () => {
      // Check if running in Tauri
      const inTauri = licenseService.isTauriEnvironment();
      setIsTauri(inTauri);

      // Check license (only in Tauri)
      if (inTauri) {
        const licensed = await licenseService.isLicensed();
        setIsActivated(licensed);
      }

      // Check profile
      const user = localStorage.getItem('ledger_user_name');
      if (user) {
        setHasProfile(true);
      }

      // Check PIN
      const pin = localStorage.getItem('ledger_app_pin');
      if (!pin) {
        setIsLocked(false);
      }

      setIsLoading(false);
    };

    initApp();

    // Auto Backup Check (Delayed)
    const timer = setTimeout(async () => {
      try {
        // Cloud Backup
        const { autoBackupService } = await import('./services/autoBackup');
        await autoBackupService.checkAndTriggerBackup();

        // Local OS Backup (Desktop only)
        const { localBackupService } = await import('./services/localBackup');
        await localBackupService.checkAndTriggerLocalBackup();
      } catch (err) {
        console.error('Backup checks failed', err);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return null;

  // Activation check (Tauri only)
  if (isTauri && !isActivated) {
    return <ActivationScreen onActivated={() => setIsActivated(true)} />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

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
    <LanguageProvider>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </LanguageProvider>
  )
}

export default App
