import React from 'react';
import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-xl border border-indigo-200/70 bg-white/85 shadow-sm backdrop-blur-sm dark:border-cyan-400/20 dark:bg-slate-900/75',
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }) {
    return <div className={cn('p-6 pb-2', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
    return <h3 className={cn('text-base font-semibold text-gray-900 dark:text-gray-100', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
    return <p className={cn('text-sm text-gray-600 dark:text-gray-300', className)} {...props} />;
}

function CardContent({ className, ...props }) {
    return <div className={cn('p-6 pt-2', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
