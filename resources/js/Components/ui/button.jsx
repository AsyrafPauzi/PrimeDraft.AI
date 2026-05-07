import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm hover:from-cyan-400 hover:to-indigo-500',
                secondary:
                    'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25',
                outline:
                    'border border-indigo-200/80 bg-white/80 text-slate-700 hover:bg-indigo-50 dark:border-cyan-400/30 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-cyan-500/10',
                ghost: 'text-slate-700 hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-cyan-500/10',
                destructive: 'bg-red-600 text-white hover:bg-red-700',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
