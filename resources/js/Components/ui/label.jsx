import React from 'react';
import { cn } from '../../lib/utils';

function Label({ className, ...props }) {
    return <label className={cn('text-sm font-medium text-gray-700 dark:text-gray-200', className)} {...props} />;
}

export { Label };
