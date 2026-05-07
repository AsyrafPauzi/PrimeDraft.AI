import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
    verifyFreelancerUpgrade: vi.fn().mockResolvedValue({
        eligible: true,
        already_subscribed: false,
        required_amount: 300,
        monthly_amount: 300,
        yearly_amount: 3240,
        yearly_discount_percent: 10,
        benefits: ['Client workspace', 'Freelancer dashboards'],
        message: 'Eligible for freelancer upgrade.',
    }),
    checkoutFreelancerSubscription: vi.fn().mockResolvedValue({
        payment: { id: 321, purpose: 'freelancer_subscription', status: 'pending' },
        message: 'Subscription checkout initiated.',
    }),
}));

function renderSettings(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SettingsPage freelancer upgrade', () => {
    test('normal user loads plan and can start subscription checkout', async () => {
        const user = userEvent.setup();
        renderSettings(
            <SettingsPage
                auth={{
                    token: 'token-1',
                    user: { name: 'Normal User', role: 'normal', country_code: 'MY' },
                }}
            />
        );

        expect(await screen.findByText('Eligible for freelancer upgrade.')).toBeInTheDocument();
        expect(api.verifyFreelancerUpgrade).toHaveBeenCalledWith('token-1');

        await user.click(screen.getByRole('button', { name: 'Complete subscription' }));
        expect(api.checkoutFreelancerSubscription).toHaveBeenCalledWith('token-1', {
            channel: 'billplz',
            billing_cycle: 'monthly',
        });
    });

    test('upgrade-focused route shows checkout heading', async () => {
        renderSettings(
            <SettingsPage
                focusUpgrade
                auth={{
                    token: 'token-1',
                    user: { name: 'Normal User', role: 'normal', country_code: 'MY' },
                }}
            />
        );

        expect(await screen.findByRole('heading', { name: 'Upgrade to Freelancer' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Profile settings/i })).toHaveAttribute('href', '/settings');
    });
});
