import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { UpdateToast } from '@/components/pwa/UpdateToast';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <UpdateToast />
    </Providers>
  );
}
