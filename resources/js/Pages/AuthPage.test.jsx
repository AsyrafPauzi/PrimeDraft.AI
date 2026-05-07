import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage } from './AuthPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
    loginWithPassword: vi.fn().mockResolvedValue({
        token: 'token-login',
        user: { name: 'Login User', role: 'normal' },
    }),
    requestOtp: vi.fn().mockResolvedValue({
        otp_token: 'otp-token-1',
        code: '123456',
    }),
    signupWithOtp: vi.fn().mockResolvedValue({
        token: 'token-signup',
        user: { name: 'Signup User', role: 'normal' },
    }),
}));

describe('AuthPage', () => {
    test('logs in with email and password', async () => {
        const user = userEvent.setup();
        const onAuthenticated = vi.fn();
        render(<AuthPage onAuthenticated={onAuthenticated} />);

        await user.type(screen.getByLabelText('Email'), 'asyraf@example.test');
        await user.type(screen.getByLabelText('Password'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        expect(api.loginWithPassword).toHaveBeenCalledWith({
            email: 'asyraf@example.test',
            password: 'secret123',
        });
        expect(onAuthenticated).toHaveBeenCalled();
    });

    test('requests OTP and completes signup', async () => {
        const user = userEvent.setup();
        const onAuthenticated = vi.fn();
        render(<AuthPage onAuthenticated={onAuthenticated} />);

        await user.click(screen.getByRole('button', { name: 'Sign Up' }));
        await user.type(screen.getByLabelText('Phone'), '+601122334455');
        await user.type(screen.getByLabelText('Name'), 'Asyraf');
        await user.type(screen.getByLabelText('Email'), 'asyraf@example.test');
        await user.type(screen.getByLabelText('Password'), 'secret123');

        await user.click(screen.getByRole('button', { name: 'Request OTP for Sign Up' }));
        expect(api.requestOtp).toHaveBeenCalledWith('+601122334455');

        await user.type(screen.getByLabelText('OTP Code'), '123456');
        await user.click(screen.getByRole('button', { name: 'Complete Sign Up' }));

        expect(api.signupWithOtp).toHaveBeenCalledWith(
            expect.objectContaining({
                otp_token: 'otp-token-1',
                code: '123456',
                email: 'asyraf@example.test',
                password: 'secret123',
            })
        );
        expect(onAuthenticated).toHaveBeenCalled();
    });
});
