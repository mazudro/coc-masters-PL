import { Analytics } from '@vercel/analytics/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';
import { ErrorFallback } from './ErrorFallback.tsx';

import './i18n';

import "./index.css";
import "./main.css";
import "./styles/theme.css";

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
)
