import { RouterProvider } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './providers';
import { router } from './router';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { SwNavigationBridge } from '@/components/pwa/SwNavigationBridge';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <UpdateToast />
      <SwNavigationBridge />
      {/*
       * Vercel Web Analytics — only emits beacons in production. Free tier covers up to
       * 25k events / month, no PII collected, fully GDPR-compliant. Tracks page views,
       * bounce rate, referrers, devices.
       */}
      <Analytics />
    </Providers>
  );
}
