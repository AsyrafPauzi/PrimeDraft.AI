import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingPage } from './BillingPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
    getBillingHistory: vi.fn().mockResolvedValue({
        payments: [],
        downloads: [],
    }),
}));

describe('BillingPage', () => {
    test('loads billing history on mount', async () => {
        render(<BillingPage token="token" />);

        await waitFor(() => {
            expect(api.getBillingHistory).toHaveBeenCalledWith('token');
        });
    });

    test('Refresh button reloads billing history', async () => {
        const user = userEvent.setup();

        render(<BillingPage token="token" />);

        await waitFor(() => {
            expect(api.getBillingHistory).toHaveBeenCalled();
        });

        const callsAfterMount = api.getBillingHistory.mock.calls.length;

        await user.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => {
            expect(api.getBillingHistory.mock.calls.length).toBeGreaterThan(callsAfterMount);
        });
    });
});
