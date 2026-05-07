import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export function DashboardPage({ auth, projects }) {
    const activeProjects = projects.length;
    const role = auth?.user?.role || 'normal';

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription>Current role</CardDescription>
                        <CardTitle className="capitalize">{role}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary">{auth?.user?.name || 'Unknown user'}</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Projects</CardDescription>
                        <CardTitle>{activeProjects}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">Track active design pipelines.</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>MVP status</CardDescription>
                        <CardTitle>On Track</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">Frontend shell is active for all core pages.</CardContent>
                </Card>
            </div>
        </div>
    );
}
