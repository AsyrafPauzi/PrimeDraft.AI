import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock3, Layers, ShieldCheck, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../lib/api';

function ProgressMeter({ label, value }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-300">{label}</span>
                <span className="font-medium">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                <div className="h-2 rounded-full bg-indigo-600 transition-all dark:bg-indigo-400" style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

export function NormalDashboardPage({ auth }) {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadSummary() {
            if (!auth?.token) {
                return;
            }

            setLoading(true);
            setError('');
            try {
                const payload = await getDashboardSummary(auth.token);
                if (!active) {
                    return;
                }
                setSummary(payload.summary || {});
                setActivities(Array.isArray(payload.activities) ? payload.activities : []);
            } catch (requestError) {
                if (!active) {
                    return;
                }
                setError(requestError.message || 'Failed to load dashboard summary.');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadSummary();
        return () => {
            active = false;
        };
    }, [auth?.token]);

    const fallbackSummary = useMemo(
        () => ({
            total_projects: 0,
            active_projects: 0,
            completed_projects: 0,
            pipeline_health: 0,
            qa_pass_rate: 0,
            latest_project_id: null,
            pending_downloads: 0,
            queued_generations: 0,
        }),
        []
    );

    const realSummary = summary || fallbackSummary;

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-indigo-50 p-6 dark:border-gray-800 dark:from-gray-900 dark:to-indigo-950/50">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Executive overview</p>
                        <h1 className="text-2xl font-semibold">Dashboard</h1>
                        <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                            Welcome back, {auth?.user?.name || 'User'}. Monitor delivery health, creative throughput, and quality readiness in
                            one workspace.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                            {auth?.user?.role || 'normal'}
                        </Badge>
                        <Button
                            size="sm"
                            type="button"
                            onClick={() => navigate('/projects')}
                            disabled={loading || !realSummary.latest_project_id}
                        >
                            {realSummary.latest_project_id ? 'Open Latest Project' : 'No project available'}
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>Total Projects</CardDescription>
                        <CardTitle className="text-2xl">{realSummary.total_projects}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-300">All workstreams currently tracked in PrimeDraft.</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Active Pipelines</CardDescription>
                        <CardTitle className="text-2xl">{realSummary.active_projects}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-300">Projects in active generation and revision cycles.</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Completed Deliveries</CardDescription>
                        <CardTitle className="text-2xl">{realSummary.completed_projects}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-300">Assets cleared and ready for downstream fulfillment.</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Pipeline Health</CardDescription>
                        <CardTitle className="text-2xl">{realSummary.pipeline_health}%</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-emerald-700 dark:text-emerald-300">On track based on schedule and readiness signals.</CardContent>
                </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                            Operational readiness
                        </CardTitle>
                        <CardDescription>Core operational metrics for enterprise-level monitoring.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ProgressMeter label="Design throughput" value={Math.min(100, 30 + realSummary.completed_generations * 10)} />
                        <ProgressMeter label="Print compliance" value={Math.min(100, 35 + realSummary.valid_print_files * 12)} />
                        <ProgressMeter label="Approval SLA adherence" value={realSummary.pipeline_health} />
                        <ProgressMeter label="Quality assurance pass rate" value={realSummary.qa_pass_rate} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                            Governance
                        </CardTitle>
                        <CardDescription>Current control posture.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                            <span>Role access policy</span>
                            <Badge variant="secondary">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                            <span>Pending downloads</span>
                            <Badge variant="secondary">{realSummary.pending_downloads}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                            <span>Queued generations</span>
                            <Badge variant="secondary">{realSummary.queued_generations}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            Recent activity
                        </CardTitle>
                        <CardDescription>Latest updates from your workspace.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            {activities.length === 0 ? (
                                <li className="rounded-md border border-gray-200 px-3 py-2 text-gray-500 dark:border-gray-800">
                                    No activity yet.
                                </li>
                            ) : (
                                activities.map((activity) => (
                                    <li key={`${activity.type}-${activity.timestamp}`} className="rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800">
                                        {activity.message}
                                    </li>
                                ))
                            )}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                            Recommended next actions
                        </CardTitle>
                        <CardDescription>High-impact actions to improve delivery outcomes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                            <p className="font-medium">Prepare one reusable brand template</p>
                            <p className="mt-1 text-gray-600 dark:text-gray-300">Reduce iteration time for your next 3 campaigns.</p>
                            <Link to="/projects" className="mt-2 inline-block">
                                <Button size="sm" variant="outline">
                                    Go to Projects
                                </Button>
                            </Link>
                        </div>
                        <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                            <p className="font-medium">Run high-res print validation</p>
                            <p className="mt-1 text-gray-600 dark:text-gray-300">Catch 360 DPI and color-count issues before checkout.</p>
                            <Link to="/billing" className="mt-2 inline-block">
                                <Button size="sm" variant="outline">
                                    Go to Billing
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </section>
            {loading ? <p className="text-sm text-gray-500">Loading live dashboard data...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
    );
}
