import React from 'react';
import { cn } from '../../lib/utils';

function Separator({ className, orientation = 'horizontal' }) {
    return (
        <div
            className={cn(
                'shrink-0 bg-gray-200',
                orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
                className
            )}
        />
    );
}

export { Separator };
