import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const notify = useCallback((message, type = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts((current) => [...current, { id, message, type }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 2800);
    }, []);

    const contextValue = useMemo(() => ({ notify }), [notify]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={cn(
                            'rounded-md px-4 py-2 text-sm shadow-lg',
                            toast.type === 'error' && 'bg-red-600 text-white',
                            toast.type === 'success' && 'bg-emerald-600 text-white',
                            toast.type === 'info' && 'bg-gray-900 text-white'
                        )}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
