import { createContext, useContext } from 'react';
import {
  type ErrorBoundaryProps,
  type FallbackProps,
  ErrorBoundary as ReactErrorBoundary,
} from 'react-error-boundary';

interface ErrorBoundaryContextType extends FallbackProps {
  error: string;
}

const ErrorBoundaryContext = createContext<
  ErrorBoundaryContextType | undefined
>(undefined);

const ErrorBoundaryContextProvider = ({
  children,
  ...fallbackProps
}: FallbackProps & { children: React.ReactNode; error: string }) => {
  return (
    <ErrorBoundaryContext.Provider value={fallbackProps}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={(fallbackProps) => (
        <ErrorBoundaryContextProvider
          {...fallbackProps}
          error={getErrorMessage(fallbackProps.error)}
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
