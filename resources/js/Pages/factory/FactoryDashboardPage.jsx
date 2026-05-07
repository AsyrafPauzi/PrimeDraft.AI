import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export function FactoryDashboardPage({ auth }) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Factory Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardDescription>Factory account</CardDescription>
                        <CardTitle>{auth?.user?.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="warning">Factory Role</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Production status</CardDescription>
                        <CardTitle>Ready for queue intake</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">Check `Orders` for latest production tasks.</CardContent>
                </Card>
            </div>
        </div>
    );
}
