/**
 * useToast Hook - Toast Management
 * 
 * Custom hook for managing toast notifications.
 * 
 * @example
 * ```tsx
 * const { showToast, toasts } = useToast();
 * 
 * showToast({
 *   title: 'Success!',
 *   description: 'Your listing was created',
 *   variant: 'success'
 * });
 * ```
 */

'use client';

import React from 'react';
import { Toast, ToastContainer, ToastProps } from './Toast';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextValue {
  toasts: Omit<ToastProps, 'onClose'>[];
  showToast: (options: ToastOptions) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Omit<ToastProps, 'onClose'>[]>([]);

  const showToast = React.useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, ...options }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
