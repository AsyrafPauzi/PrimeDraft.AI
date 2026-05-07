import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, WandSparkles, CreditCard, Settings, Menu, Moon, Sun, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge, badgeVariants } from '../ui/badge';
import { cn } from '../../lib/utils';

function pageTitleFromPath(pathname) {
    const path = pathname || '/';
    const rules = [
        [/^\/settings\/upgrade\/?$/, 'Upgrade plan'],
        [/^\/settings\/?$/, 'Settings'],
        [/^\/dashboard\/?$/, 'Dashboard'],
        [/^\/projects\/?$/, 'Projects'],
        [/^\/editor\/?$/, 'Editor'],
        [/^\/billing\/?$/, 'Billing'],
        [/^\/clients\/?$/, 'Clients'],
        [/^\/orders\/?$/, 'Orders'],
        [/^\/matching\/?$/, 'Matching'],
    ];
    for (const [pattern, title] of rules) {
        if (pattern.test(path)) {
            return title;
        }
    }
    return 'PrimeDraft';
}

export const defaultNavigationItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/editor', label: 'Editor', icon: WandSparkles },
    { to: '/billing', label: 'Billing', icon: CreditCard },
    { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarNav({ navItems, onNavigate, collapsed = false }) {
    return (
        <nav className="space-y-1">
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    aria-label={item.label}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                            collapsed && 'justify-center px-2',
                            isActive
                                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-cyan-500/10'
                        )
                    }
                >
                    <item.icon className="h-4 w-4" />
                    <span className={cn(collapsed && 'hidden')}>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

export function AppShell({
    userName,
    onLogout,
    theme,
    onToggleTheme,
    navItems = defaultNavigationItems,
    subscriptionChip,
    headerTitle,
    children,
}) {
    const location = useLocation();
    const resolvedHeaderTitle = useMemo(
        () => headerTitle ?? pageTitleFromPath(location.pathname),
        [headerTitle, location.pathname]
    );
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen text-slate-900 dark:text-slate-100">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
                Skip to content
            </a>
            <div className="flex min-h-screen">
                <aside
                    className={cn(
                        'hidden border-r border-indigo-200/70 bg-white/70 p-4 backdrop-blur-sm transition-all duration-200 dark:border-cyan-400/20 dark:bg-slate-900/70 lg:block',
                        desktopSidebarCollapsed ? 'w-[78px]' : 'w-64'
                    )}
                >
                    <Link
                        to="/dashboard"
                        className={cn('mb-6 flex items-center gap-2', desktopSidebarCollapsed && 'justify-center')}
                        aria-label="PrimeDraft home"
                    >
                        <img
                            src="/brand/primedraft-logo.svg"
                            alt="PrimeDraft logo"
                            className={cn('h-8 w-auto', desktopSidebarCollapsed && 'h-7')}
                        />
                    </Link>
                    <SidebarNav navItems={navItems} collapsed={desktopSidebarCollapsed} />
                </aside>

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-indigo-200/70 bg-white/70 px-4 backdrop-blur-sm dark:border-cyan-400/20 dark:bg-slate-900/70 lg:px-6">
                        <div className="flex items-center gap-2">
                            <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                                <Dialog.Trigger asChild>
                                    <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </Dialog.Trigger>
                                <Dialog.Portal>
                                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
                                    <Dialog.Content className="fixed left-0 top-0 z-50 h-full w-72 border-r border-indigo-200/70 bg-white/90 p-4 backdrop-blur-sm dark:border-cyan-400/20 dark:bg-slate-900/90 lg:hidden">
                                        <Dialog.Title className="mb-6">
                                            <img src="/brand/primedraft-logo.svg" alt="PrimeDraft logo" className="h-8 w-auto" />
                                        </Dialog.Title>
                                        <SidebarNav navItems={navItems} onNavigate={() => setMobileNavOpen(false)} collapsed={false} />
                                    </Dialog.Content>
                                </Dialog.Portal>
                            </Dialog.Root>
                            <Button
                                variant="outline"
                                size="icon"
                                className="hidden lg:inline-flex"
                                aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                            >
                                {desktopSidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                            </Button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{resolvedHeaderTitle}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {subscriptionChip?.label ? (
                                subscriptionChip.to ? (
                                    <Link
                                        to={subscriptionChip.to}
                                        className={cn(
                                            badgeVariants({ variant: subscriptionChip.variant || 'secondary' }),
                                            'cursor-pointer no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                                        )}
                                    >
                                        {subscriptionChip.label}
                                    </Link>
                                ) : (
                                    <Badge variant={subscriptionChip.variant || 'secondary'}>{subscriptionChip.label}</Badge>
                                )
                            ) : null}
                            <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={onToggleTheme}>
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <Button variant="outline" size="sm" aria-label="Open user menu">
                                        {userName || 'User'}
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        sideOffset={8}
                                        className="rounded-md border border-indigo-200/70 bg-white/90 p-1 shadow-md backdrop-blur-sm dark:border-cyan-400/20 dark:bg-slate-900/85"
                                    >
                                        <DropdownMenu.Item className="cursor-default rounded px-2 py-1.5 text-sm text-slate-500 dark:text-slate-300">
                                            Signed in
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator className="my-1 h-px bg-indigo-200/70 dark:bg-cyan-400/20" />
                                        <DropdownMenu.Item
                                            onSelect={onLogout}
                                            className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-cyan-500/10"
                                        >
                                            Logout
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </div>
                    </header>

                    <main id="main-content" className="min-w-0 flex-1 p-4 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
