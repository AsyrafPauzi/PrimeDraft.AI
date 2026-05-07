import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

export function FreelancerClientsPage({ projects }) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Client Status</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Queue</CardTitle>
                    <CardDescription>Role-specific client facing status page.</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <p className="text-sm text-gray-600">No client projects yet.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {projects.map((project) => (
                                <li key={project.id} className="rounded border p-3">
                                    {project.name} - {project.status || 'active'}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
