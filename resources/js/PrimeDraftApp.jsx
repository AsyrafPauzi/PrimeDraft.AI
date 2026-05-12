import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { loadAuth, saveAuth, clearAuth } from './lib/auth';
import { applyTheme, loadTheme } from './lib/theme';
import { getSubscriptionStatus, updateProfile } from './lib/api';
import { AuthPage } from './Pages/AuthPage';
import { FolderKanban, LayoutDashboard, Settings, Sparkles, WandSparkles, CreditCard, Users, PackageSearch, ShoppingBag } from 'lucide-react';
import { OrdersPage } from './Pages/OrdersPage';
import { NormalDashboardPage } from './Pages/normal/NormalDashboardPage';
import { NormalProjectsPage } from './Pages/normal/NormalProjectsPage';
import { NormalEditorPage } from './Pages/normal/NormalEditorPage';
import { NormalBillingPage } from './Pages/normal/NormalBillingPage';
import { NormalSettingsPage } from './Pages/normal/NormalSettingsPage';
import { FreelancerDashboardPage } from './Pages/freelancer/FreelancerDashboardPage';
import { FreelancerProjectsPage } from './Pages/freelancer/FreelancerProjectsPage';
import { FreelancerEditorPage } from './Pages/freelancer/FreelancerEditorPage';
import { FreelancerClientsPage } from './Pages/freelancer/FreelancerClientsPage';
import { FreelancerSettingsPage } from './Pages/freelancer/FreelancerSettingsPage';
import { FactoryDashboardPage } from './Pages/factory/FactoryDashboardPage';
import { FactoryOrdersPage } from './Pages/factory/FactoryOrdersPage';
import { FactoryMatchingPage } from './Pages/factory/FactoryMatchingPage';
import { FactorySettingsPage } from './Pages/factory/FactorySettingsPage';
import { ToastProvider, useToast } from './components/ui/toast';

function ProtectedApp({
    auth,
    setAuth,
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    onLogout,
    theme,
    onToggleTheme,
    subscriptionChip,
}) {
    const { notify } = useToast();
    const location = useLocation();
    const role = auth?.user?.role || 'normal';
    const editorStandalone =
        /^\/editor\/?$/.test(location.pathname) && (role === 'normal' || role === 'freelancer');
    const selectedProject = React.useMemo(
        () => projects.find((p) => p.id === selectedProjectId) || null,
        [projects, selectedProjectId]
    );

    const handleProfileUpdate = useCallback(
        async (updates) => {
            try {
                const { user } = await updateProfile(auth.token, updates);
                const nextAuth = { ...auth, user };
                saveAuth(nextAuth);
                setAuth(nextAuth);
                notify('Settings updated.', 'success');
            } catch (error) {
                notify(error?.message || 'Could not save settings.', 'error');
                throw error;
            }
        },
        [auth, setAuth, notify]
    );

    const normalRoutes = (
        <>
            <Route path="/dashboard" element={<NormalDashboardPage auth={auth} projects={projects} />} />
            <Route
                path="/projects"
                element={
                    <NormalProjectsPage
                        role={role}
                        token={auth.token}
                        projects={projects}
                        defaultCountryCode={auth?.user?.country_code || 'MY'}
                        onProjectsChange={setProjects}
                        onSelectProject={setSelectedProjectId}
                        onNotify={notify}
                    />
                }
            />
            <Route
                path="/editor"
                element={
                    <NormalEditorPage
                        role={role}
                        token={auth.token}
                        selectedProjectId={selectedProjectId}
                        selectedProject={selectedProject}
                        onNotify={notify}
                        onProjectFieldsUpdate={(projectId, fields) => {
                            setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...fields } : p)));
                        }}
                    />
                }
            />
            <Route
                path="/orders"
                element={
                    <OrdersPage
                        token={auth.token}
                        onSelectProject={setSelectedProjectId}
                        onNotify={notify}
                    />
                }
            />
            <Route
                path="/billing"
                element={
                    <NormalBillingPage
                        role={role}
                        token={auth.token}
                        selectedProjectId={selectedProjectId}
                        onNotify={notify}
                    />
                }
            />
            <Route
                path="/settings/upgrade"
                element={
                    <NormalSettingsPage auth={auth} focusUpgrade onProfileUpdate={handleProfileUpdate} />
                }
            />
            <Route
                path="/settings"
                element={
                    <NormalSettingsPage auth={auth} onProfileUpdate={handleProfileUpdate} />
                }
            />
        </>
    );

    const freelancerRoutes = (
        <>
            <Route path="/dashboard" element={<FreelancerDashboardPage auth={auth} projects={projects} />} />
            <Route
                path="/projects"
                element={
                    <FreelancerProjectsPage
                        role={role}
                        token={auth.token}
                        projects={projects}
                        defaultCountryCode={auth?.user?.country_code || 'MY'}
                        onProjectsChange={setProjects}
                        onSelectProject={setSelectedProjectId}
                        onNotify={notify}
                    />
                }
            />
            <Route
                path="/editor"
                element={
                    <FreelancerEditorPage
                        role={role}
                        token={auth.token}
                        selectedProjectId={selectedProjectId}
                        selectedProject={selectedProject}
                        onNotify={notify}
                        onProjectFieldsUpdate={(projectId, fields) => {
                            setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...fields } : p)));
                        }}
                    />
                }
            />
            <Route path="/clients" element={<FreelancerClientsPage projects={projects} />} />
            <Route
                path="/orders"
                element={
                    <OrdersPage
                        token={auth.token}
                        onSelectProject={setSelectedProjectId}
                        onNotify={notify}
                    />
                }
            />
            <Route
                path="/settings"
                element={
                    <FreelancerSettingsPage auth={auth} onProfileUpdate={handleProfileUpdate} />
                }
            />
        </>
    );

    const factoryRoutes = (
        <>
            <Route path="/dashboard" element={<FactoryDashboardPage auth={auth} />} />
            <Route path="/orders" element={<FactoryOrdersPage token={auth.token} onNotify={notify} />} />
            <Route path="/matching" element={<FactoryMatchingPage token={auth.token} onNotify={notify} />} />
            <Route
                path="/settings"
                element={
                    <FactorySettingsPage auth={auth} onProfileUpdate={handleProfileUpdate} />
                }
            />
        </>
    );

    const navItemsByRole = {
        normal: [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/projects', label: 'Projects', icon: FolderKanban },
            { to: '/orders', label: 'Orders', icon: ShoppingBag },
            { to: '/billing', label: 'Billing', icon: CreditCard },
            { to: '/settings/upgrade', label: 'Upgrade plan', icon: Sparkles },
            { to: '/settings', label: 'Settings', icon: Settings, end: true },
        ],
        freelancer: [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/projects', label: 'Projects', icon: FolderKanban },
            { to: '/editor', label: 'Editor', icon: WandSparkles },
            { to: '/orders', label: 'Orders', icon: ShoppingBag },
            { to: '/clients', label: 'Clients', icon: Users },
            { to: '/settings', label: 'Settings', icon: Settings, end: true },
        ],
        factory: [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/orders', label: 'Orders', icon: PackageSearch },
            { to: '/matching', label: 'Matching', icon: Users },
            { to: '/settings', label: 'Settings', icon: Settings, end: true },
        ],
    };

    const appRoutes = (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {role === 'normal' ? normalRoutes : null}
            {role === 'freelancer' ? freelancerRoutes : null}
            {role === 'factory' ? factoryRoutes : null}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );

    if (editorStandalone) {
        return (
            <div className="fixed inset-0 z-[2] flex min-h-[100dvh] flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">{appRoutes}</div>
            </div>
        );
    }

    return (
        <AppShell
            userName={auth?.user?.name}
            onLogout={onLogout}
            theme={theme}
            onToggleTheme={onToggleTheme}
            navItems={navItemsByRole[role] || navItemsByRole.normal}
            subscriptionChip={subscriptionChip}
        >
            {appRoutes}
        </AppShell>
    );
}

export function PrimeDraftApp() {
    const [auth, setAuth] = useState(() => loadAuth());
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [theme, setTheme] = useState(() => loadTheme());
    const [subscriptionChip, setSubscriptionChip] = useState(null);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        let active = true;

        async function loadSubscriptionChip() {
            if (!auth?.token) {
                if (active) {
                    setSubscriptionChip(null);
                }
                return;
            }

            try {
                const payload = await getSubscriptionStatus(auth.token);
                if (!active) {
                    return;
                }

                const variant =
                    payload.status === 'active' ? 'success' : payload.status === 'pending' ? 'warning' : 'secondary';
                const upgradeLink =
                    payload.plan === 'normal' && payload.status === 'upgrade_available' ? '/settings/upgrade' : null;
                setSubscriptionChip({
                    label: payload.label || 'Plan Status',
                    variant,
                    to: upgradeLink,
                });
            } catch {
                if (active) {
                    setSubscriptionChip({
                        label: (auth?.user?.role || 'normal').toUpperCase(),
                        variant: 'secondary',
                    });
                }
            }
        }

        loadSubscriptionChip();
        return () => {
            active = false;
        };
    }, [auth]);

    const shellProps = useMemo(
        () => ({
            auth,
            setAuth,
            projects,
            setProjects,
            selectedProjectId,
            setSelectedProjectId,
            onLogout: () => {
                clearAuth();
                setAuth(null);
                setProjects([]);
                setSelectedProjectId(null);
            },
            theme,
            onToggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
            subscriptionChip,
        }),
        [auth, projects, selectedProjectId, theme, subscriptionChip]
    );

    return (
        <ToastProvider>
            <BrowserRouter>
                {auth ? (
                    <ProtectedApp {...shellProps} />
                ) : (
                    <AuthPage
                        onAuthenticated={(payload) => {
                            saveAuth(payload);
                            setAuth(payload);
                        }}
                    />
                )}
            </BrowserRouter>
        </ToastProvider>
    );
}
