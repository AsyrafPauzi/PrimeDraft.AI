import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectsPage } from './ProjectsPage';
import * as api from '../lib/api';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/api', () => ({
    createProject: vi.fn().mockResolvedValue({
        project: {
            id: 11,
            name: 'New Project',
            country_code: 'MY',
            status: 'active',
            scratch_layout: { merchandise: 'T-Shirt', version: 1 },
        },
    }),
    getProjects: vi.fn().mockResolvedValue({
        projects: [],
        pagination: { current_page: 1, per_page: 10, last_page: 1, total: 0 },
        slots: { limit: 3, active: 0, remaining: 3 },
    }),
    getProject: vi.fn().mockResolvedValue({
        project: { id: 1, name: 'Demo Project', country_code: 'MY', status: 'active', created_at: new Date().toISOString() },
    }),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
}));

describe('ProjectsPage', () => {
    test('validates minimum project name length', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ProjectsPage
                    token="token"
                    role="normal"
                    projects={[]}
                    presets={[{ id: 'sports-jersey-basic', name: 'Sports Jersey Basic' }]}
                    onProjectsChange={vi.fn()}
                    onSelectProject={vi.fn()}
                />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Create New Project' }));
        await user.type(screen.getByLabelText('Name'), 'AB');
        await user.click(screen.getByRole('button', { name: 'Create Project' }));

        expect(screen.getByText('Project name must be at least 3 characters.')).toBeInTheDocument();
    });

    test('creates project from modal using settings country code', async () => {
        const user = userEvent.setup();
        const onProjectsChange = vi.fn();

        render(
            <MemoryRouter>
                <ProjectsPage
                    token="token"
                    role="normal"
                    projects={[]}
                    presets={[{ id: 'sports-jersey-basic', name: 'Sports Jersey Basic' }]}
                    onProjectsChange={onProjectsChange}
                    onSelectProject={vi.fn()}
                    defaultCountryCode="MY"
                />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Create New Project' }));
        await user.type(screen.getByLabelText('Name'), 'Project Enterprise');
        await user.click(screen.getByRole('button', { name: 'Create Project' }));

        expect(api.createProject).toHaveBeenCalledWith('token', {
            name: 'Project Enterprise',
            country_code: 'MY',
            merchandise: null,
        });
        expect(onProjectsChange).toHaveBeenCalled();
    });

    test('sends selected merchandise when creating project', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ProjectsPage
                    token="token"
                    role="normal"
                    projects={[]}
                    presets={[{ id: 'sports-jersey-basic', name: 'Sports Jersey Basic' }]}
                    onProjectsChange={vi.fn()}
                    onSelectProject={vi.fn()}
                    defaultCountryCode="MY"
                />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Create New Project' }));
        await user.click(screen.getByRole('button', { name: 'T-Shirt' }));
        await user.click(screen.getByRole('button', { name: 'Create Project' }));

        expect(api.createProject).toHaveBeenCalledWith('token', {
            name: 'T-Shirt Project',
            country_code: 'MY',
            merchandise: 'T-Shirt',
        });
    });

    test('renders enterprise table controls', async () => {
        render(
            <MemoryRouter>
                <ProjectsPage
                    token="token"
                    role="normal"
                    projects={[]}
                    presets={[{ id: 'sports-jersey-basic', name: 'Sports Jersey Basic' }]}
                    onProjectsChange={vi.fn()}
                    onSelectProject={vi.fn()}
                    defaultCountryCode="MY"
                />
            </MemoryRouter>
        );

        expect(screen.getByPlaceholderText('Search project name or country...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply Search' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Archive Selected' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete Selected' })).toBeInTheDocument();
    });
});
