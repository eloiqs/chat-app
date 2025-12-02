import { createContext, useContext } from 'react';
import {
  type ErrorBoundaryProps,
  type FallbackProps,
  ErrorBoundary as ReactErrorBoundary,
} from 'react-error-boundary';

interface ErrorBoundaryContextType extends FallbackProps {
  error: unknown;
}

const ErrorBoundaryContext = createContext<
  ErrorBoundaryContextType | undefined
>(undefined);

const ErrorBoundaryContextProvider = ({
  children,
  ...fallbackProps
}: FallbackProps & { children: React.ReactNode }) => {
  return (
    <ErrorBoundaryContext.Provider value={fallbackProps}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={(fallbackProps) => (
        <ErrorBoundaryContextProvider
          {...fallbackProps}
          error={fallbackProps.error as unknown}
        >
          {fallback}
        </ErrorBoundaryContextProvider>
      )}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export function useError() {
  const context = useContext(ErrorBoundaryContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorBoundary');
  }
  return context;
}
