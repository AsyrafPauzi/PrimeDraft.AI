import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimeDraftApp } from './PrimeDraftApp';

describe('PrimeDraftApp shell routing', () => {
    test('renders auth page when user is not authenticated', () => {
        window.localStorage.clear();
        window.history.pushState({}, '', '/');

        render(<PrimeDraftApp />);

        expect(screen.getByText('Sign in to PrimeDraft.AI')).toBeInTheDocument();
    });

    test('navigates to projects page when authenticated', async () => {
        const user = userEvent.setup();

        window.localStorage.setItem(
            'primedraft-auth',
            JSON.stringify({
                token: 'test-token',
                user: { name: 'Asyraf', role: 'normal', country_code: 'MY' },
            })
        );
        window.history.pushState({}, '', '/dashboard');

        render(<PrimeDraftApp />);

        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        await user.click(screen.getByRole('link', { name: 'Projects' }));

        expect(screen.getByRole('heading', { name: 'Project Management' })).toBeInTheDocument();
    });

    test('renders factory specific navigation for factory role', () => {
        window.localStorage.setItem(
            'primedraft-auth',
            JSON.stringify({
                token: 'factory-token',
                user: { name: 'Factory User', role: 'factory', country_code: 'MY' },
            })
        );
        window.history.pushState({}, '', '/dashboard');

        render(<PrimeDraftApp />);

        expect(screen.getByRole('heading', { name: 'Factory Dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();
    });
});
