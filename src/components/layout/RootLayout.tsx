import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationPermissionPrompt } from '@/components/pwa/NotificationPermissionPrompt';
import { useIsDesktop } from '@/hooks/useMediaQuery';

export function RootLayout() {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {isDesktop && <Sidebar />}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      {!isDesktop && <BottomTabs />}
      {/*
       * One-shot post-sign-in nudge to enable Web Push. Renders nothing unless the app is
       * launched in standalone mode AND the user hasn't yet committed yes/no AND we
       * haven't asked in the last 24h. See NotificationPermissionPrompt for the full gate
       * matrix.
       */}
      <NotificationPermissionPrompt />
    </div>
  );
}
