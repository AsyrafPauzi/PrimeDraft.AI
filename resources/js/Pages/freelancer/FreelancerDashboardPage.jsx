import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export function FreelancerDashboardPage({ auth, projects }) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Freelancer Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription>Account</CardDescription>
                        <CardTitle>{auth?.user?.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary">Freelancer</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Client projects</CardDescription>
                        <CardTitle>{projects.length}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">Manage active client revisions and exports.</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Status</CardDescription>
                        <CardTitle>Delivery Window Open</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">Prioritize projects tagged urgent.</CardContent>
                </Card>
            </div>
        </div>
    );
}
