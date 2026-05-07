import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
    variants: {
        variant: {
            default: 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white',
            secondary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
            success: 'bg-emerald-100 text-emerald-700',
            warning: 'bg-amber-100 text-amber-700',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

function Badge({ className, variant, ...props }) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
