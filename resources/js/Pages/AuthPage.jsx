import React, { useState } from 'react';
import { loginWithPassword, requestOtp, signupWithOtp } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function AuthPage({ onAuthenticated }) {
    const [mode, setMode] = useState('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('normal');
    const [serverOtpHint, setServerOtpHint] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = await loginWithPassword({
                email: loginEmail,
                password: loginPassword,
            });
            onAuthenticated(payload);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRequestOtp(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = await requestOtp(phone);
            setOtpToken(payload.otp_token);
            setServerOtpHint(payload.code || '');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = await signupWithOtp({
                otp_token: otpToken,
                code,
                name,
                email,
                password,
                role,
            });
            onAuthenticated(payload);
        } catch (verifyError) {
            setError(verifyError.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto mt-10 max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>{mode === 'login' ? 'Sign in to PrimeDraft.AI' : 'Create PrimeDraft account'}</CardTitle>
                    <CardDescription>
                        {mode === 'login'
                            ? 'Use your email and password to sign in.'
                            : 'Sign up with OTP verification to prevent dummy email registrations.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')} type="button">
                            Login
                        </Button>
                        <Button variant={mode === 'signup' ? 'default' : 'outline'} onClick={() => setMode('signup')} type="button">
                            Sign Up
                        </Button>
                    </div>

                    {mode === 'login' ? (
                        <form className="space-y-3" onSubmit={handleLogin}>
                            <div className="space-y-2">
                                <Label htmlFor="login-email">Email</Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    value={loginEmail}
                                    onChange={(event) => setLoginEmail(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-password">Password</Label>
                                <Input
                                    id="login-password"
                                    type="password"
                                    value={loginPassword}
                                    onChange={(event) => setLoginPassword(event.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-3" onSubmit={otpToken ? handleVerifyOtp : handleRequestOtp}>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    placeholder="+6012..."
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-email">Email</Label>
                                <Input
                                    id="signup-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Password</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <select
                                    id="role"
                                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                                    value={role}
                                    onChange={(event) => setRole(event.target.value)}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="freelancer">Freelancer</option>
                                    <option value="factory">Factory</option>
                                </select>
                            </div>
                            {otpToken ? (
                                <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                                    <Label htmlFor="otp-code">OTP Code</Label>
                                    <Input
                                        id="otp-code"
                                        value={code}
                                        onChange={(event) => setCode(event.target.value)}
                                        maxLength={6}
                                        required
                                    />
                                    {serverOtpHint ? (
                                        <p className="text-xs text-gray-500">Demo code from server: {serverOtpHint}</p>
                                    ) : null}
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Verifying...' : 'Complete Sign Up'}
                                    </Button>
                                </div>
                            ) : (
                                <Button type="submit" disabled={loading || phone.trim() === ''}>
                                    {loading ? 'Requesting...' : 'Request OTP for Sign Up'}
                                </Button>
                            )}
                        </form>
                    )}

                    <div aria-live="polite">{error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}</div>
                </CardContent>
            </Card>
        </div>
    );
}
