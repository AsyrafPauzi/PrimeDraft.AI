import React, { useEffect, useMemo, useState } from 'react';
import { bulkProjectAction, checkoutDownload, createProject, deleteProject, downloadHighRes, getProject, getProjects } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpDown, Download, Eye, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MERCHANDISE_OPTIONS, getScratchMerchandise, getMerchandisePreviewUrl } from '../lib/merchandisePreview';
import { Textarea } from '../components/ui/textarea';
import { ScratchLayoutPreview } from '../Components/Editor/ScratchLayoutPreview';

export function ProjectsPage({
    token,
    projects,
    onProjectsChange,
    onSelectProject,
    onNotify,
    role = 'normal',
    presets = [],
    defaultCountryCode = 'MY',
}) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [presetId, setPresetId] = useState(presets[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [slots, setSlots] = useState({ limit: null, active: 0, remaining: null });
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        last_page: 1,
        total: 0,
    });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [viewProject, setViewProject] = useState(null);
    const [merchandiseQuery, setMerchandiseQuery] = useState('');
    const [selectedMerchandise, setSelectedMerchandise] = useState('');
    const [clientReference, setClientReference] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
    const [priority, setPriority] = useState('normal');
    const [estimatedQuantity, setEstimatedQuantity] = useState('');
    const [downloadingProjectId, setDownloadingProjectId] = useState(null);

    function resetCreateForm() {
        setName('');
        setPresetId(presets[0]?.id || '');
        setMerchandiseQuery('');
        setSelectedMerchandise('');
        setClientReference('');
        setInternalNotes('');
        setTargetDeliveryDate('');
        setPriority('normal');
        setEstimatedQuantity('');
    }

    const projectRows = useMemo(() => projects || [], [projects]);
    const filteredMerchandise = useMemo(() => {
        const keyword = merchandiseQuery.trim().toLowerCase();
        if (!keyword) {
            return MERCHANDISE_OPTIONS;
        }
        return MERCHANDISE_OPTIONS.filter((item) => item.toLowerCase().includes(keyword));
    }, [merchandiseQuery]);

    useEffect(() => {
        fetchProjects(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function fetchProjects(nextPage = pagination.current_page, queryOverrides = {}) {
        setTableLoading(true);
        const query = {
            page: nextPage,
            per_page: pagination.per_page,
            search,
            status: statusFilter,
            sort_by: sortBy,
            sort_dir: sortDir,
            ...queryOverrides,
        };
        try {
            const payload = await getProjects(token, query);
            onProjectsChange(payload.projects || []);
            setSlots(payload.slots || { limit: null, active: 0, remaining: null });
            setPagination((current) => ({
                ...current,
                ...(payload.pagination || {}),
            }));
            setSelectedProjectIds([]);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setTableLoading(false);
        }
    }

    async function handleCreateProject(event) {
        event.preventDefault();
        setError('');
        setStatus('');

        const finalProjectName = name.trim() || (selectedMerchandise ? `${selectedMerchandise} Project` : '');

        if (finalProjectName.length < 3) {
            setError('Project name must be at least 3 characters.');
            return;
        }
        if (!/^[A-Z]{2}$/.test(defaultCountryCode)) {
            setError('Set a valid 2-letter country code in Settings first.');
            return;
        }

        setLoading(true);

        try {
            const qtyParsed = estimatedQuantity.trim() !== '' ? parseInt(estimatedQuantity, 10) : NaN;
            const body = {
                name: finalProjectName,
                country_code: defaultCountryCode,
                merchandise: selectedMerchandise.trim() !== '' ? selectedMerchandise.trim() : null,
            };

            if (priority !== 'normal') {
                body.priority = priority;
            }

            const cref = clientReference.trim();
            if (cref !== '') body.client_reference = cref;

            const notes = internalNotes.trim();
            if (notes !== '') body.internal_notes = notes;

            if (targetDeliveryDate.trim() !== '') body.target_delivery_date = targetDeliveryDate.trim();

            if (!Number.isNaN(qtyParsed) && qtyParsed >= 1) {
                body.estimated_quantity = qtyParsed;
            }

            const payload = await createProject(token, body);
            const selectedPreset = presets.find((preset) => preset.id === presetId);
            const nextProjects = [{ ...payload.project, preset_id: selectedPreset?.id || null }, ...projectRows];
            onProjectsChange(nextProjects);
            onSelectProject(payload.project.id);
            setCreateOpen(false);
            setStatus('Project created successfully.');
            await fetchProjects(1);
            onNotify?.('Project created successfully.', 'success');
        } catch (createError) {
            setError(createError.message);
            onNotify?.(createError.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleViewProject(projectId) {
        setActionLoading(true);
        setError('');
        try {
            const payload = await getProject(token, projectId);
            setViewProject(payload.project);
            onSelectProject(projectId);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setActionLoading(false);
        }
    }

    function handleEditProject(project) {
        onSelectProject(project.id);
        navigate('/editor');
    }

    function handleMerchandisePick(label) {
        setSelectedMerchandise(label);
        if (!name.trim()) {
            setName(`${label} Project`);
        }
    }

    function renderMerchandiseBlankPreview(merchandiseLabel) {
        const trimmed = typeof merchandiseLabel === 'string' ? merchandiseLabel.trim() : '';
        const imageUrl = getMerchandisePreviewUrl(trimmed);
        if (imageUrl) {
            return (
                <div className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-[#f7f6f2] p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <img
                        src={imageUrl}
                        alt={`${trimmed || 'Merchandise'} blank template`}
                        className="mx-auto h-48 w-auto max-h-64 object-contain"
                        loading="lazy"
                        draggable={false}
                    />
                </div>
            );
        }

        return (
            <div className="flex h-48 min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="px-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No blank template mapped for this merchandise yet. Pick a catalogue item or type a common product type.
                </p>
            </div>
        );
    }

    async function handleDeleteProject(project) {
        const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete project "${project.name}"?`) : true;
        if (!confirmed) {
            return;
        }

        setActionLoading(true);
        setError('');
        try {
            await deleteProject(token, project.id);
            onProjectsChange(projectRows.filter((item) => item.id !== project.id));
            setStatus('Project deleted.');
            await fetchProjects(pagination.current_page);
            onNotify?.('Project deleted successfully.', 'success');
        } catch (requestError) {
            setError(requestError.message);
            onNotify?.(requestError.message, 'error');
        } finally {
            setActionLoading(false);
        }
    }

    function handleSort(column) {
        const nextSortBy = column;
        const nextSortDir = sortBy === column ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';

        if (sortBy === column) {
            setSortDir(nextSortDir);
        } else {
            setSortBy(nextSortBy);
            setSortDir(nextSortDir);
        }

        void fetchProjects(1, {
            sort_by: nextSortBy,
            sort_dir: nextSortDir,
        });
    }

    async function applyTableControls(overrides = {}) {
        const nextPage = overrides.page ?? 1;
        const nextSearch = overrides.search !== undefined ? overrides.search : search;
        const nextStatusFilter = overrides.statusFilter !== undefined ? overrides.statusFilter : statusFilter;
        const nextSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
        const nextSortDir = overrides.sortDir !== undefined ? overrides.sortDir : sortDir;

        if (overrides.search !== undefined) {
            setSearch(overrides.search);
        }
        if (overrides.statusFilter !== undefined) {
            setStatusFilter(overrides.statusFilter);
        }
        if (overrides.sortBy !== undefined) {
            setSortBy(overrides.sortBy);
        }
        if (overrides.sortDir !== undefined) {
            setSortDir(overrides.sortDir);
        }
        await fetchProjects(nextPage, {
            search: nextSearch,
            status: nextStatusFilter,
            sort_by: nextSortBy,
            sort_dir: nextSortDir,
        });
    }

    function toggleSelectProject(projectId) {
        setSelectedProjectIds((current) =>
            current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]
        );
    }

    function toggleSelectAllVisible() {
        if (selectedProjectIds.length === projectRows.length) {
            setSelectedProjectIds([]);
            return;
        }
        setSelectedProjectIds(projectRows.map((project) => project.id));
    }

    async function handleDownloadFile(project) {
        onSelectProject(project.id);
        setDownloadingProjectId(project.id);
        setError('');
        try {
            if (role === 'freelancer') {
                const payload = await downloadHighRes(token, project.id, { dpi: 360, color_count: 6 });
                onNotify?.('360 DPI print file ready.', 'success');
                if (typeof window !== 'undefined' && payload.download_url) {
                    window.open(payload.download_url, '_blank', 'noopener,noreferrer');
                }
            } else {
                const payload = await checkoutDownload(token, project.id, { channel: 'billplz', amount: 19 });
                onNotify?.(`Payment initiated. ID: ${payload.payment?.id || '-'}`, 'success');
                setStatus('Payment initiated. Complete the payment to unlock your print file.');
            }
        } catch (requestError) {
            const message = requestError?.message || 'Download failed.';
            if (message.toLowerCase().includes('already') || message.toLowerCase().includes('paid')) {
                try {
                    const payload = await downloadHighRes(token, project.id, { dpi: 360, color_count: 6 });
                    onNotify?.('360 DPI print file ready.', 'success');
                    if (typeof window !== 'undefined' && payload.download_url) {
                        window.open(payload.download_url, '_blank', 'noopener,noreferrer');
                    }
                } catch (dlError) {
                    setError(dlError?.message || 'Download failed.');
                    onNotify?.(dlError?.message, 'error');
                }
            } else {
                setError(message);
                onNotify?.(message, 'error');
            }
        } finally {
            setDownloadingProjectId(null);
        }
    }

    async function handleBulkAction(action) {
        if (selectedProjectIds.length === 0) {
            return;
        }
        const verb = action === 'archive' ? 'archive' : 'delete';
        const confirmed = typeof window !== 'undefined' ? window.confirm(`Confirm ${verb} selected projects?`) : true;
        if (!confirmed) {
            return;
        }

        setActionLoading(true);
        setError('');
        try {
            const payload = await bulkProjectAction(token, {
                action,
                project_ids: selectedProjectIds,
            });
            setStatus(`Bulk ${payload.action} completed. ${payload.affected} project(s) affected.`);
            await fetchProjects(pagination.current_page);
            onNotify?.(`Bulk ${payload.action} completed.`, 'success');
        } catch (requestError) {
            setError(requestError.message);
            onNotify?.(requestError.message, 'error');
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Project Management</CardTitle>
                        <CardDescription>
                            Enterprise project workspace for role: <span className="font-medium capitalize">{role}</span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            {slots.limit === null ? 'Unlimited projects' : `${slots.remaining} slot(s) left`}
                        </Badge>
                        <Button type="button" onClick={() => setCreateOpen(true)} disabled={slots.limit !== null && slots.remaining === 0}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Project
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                        Default country code from Settings: <span className="font-medium">{defaultCountryCode}</span>
                    </p>
                    <div className="mb-3 grid gap-2 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <Input
                                placeholder="Search project name or country..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        void applyTableControls({ search: event.currentTarget.value, page: 1 });
                                    }
                                }}
                            />
                        </div>
                        <select
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                            value={statusFilter}
                            onChange={(event) => void applyTableControls({ statusFilter: event.target.value, page: 1 })}
                        >
                            <option value="all">All status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                        <Button variant="outline" onClick={() => void applyTableControls({ search, page: 1 })}>
                            Apply Search
                        </Button>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{pagination.total} total project(s)</Badge>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBulkAction('archive')}
                            disabled={actionLoading || selectedProjectIds.length === 0}
                        >
                            Archive Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleBulkAction('delete')}
                            disabled={actionLoading || selectedProjectIds.length === 0}
                        >
                            Delete Selected
                        </Button>
                    </div>

                    {tableLoading || actionLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : null}
                    {!tableLoading && projectRows.length === 0 ? (
                        <p className="text-sm text-gray-600">No projects yet. Create your first project from the button above.</p>
                    ) : null}
                    {!tableLoading && projectRows.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-indigo-200/70 dark:border-cyan-400/20">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-indigo-50/70 dark:bg-cyan-500/10">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">
                                            <input
                                                type="checkbox"
                                                aria-label="Select all visible projects"
                                                checked={projectRows.length > 0 && selectedProjectIds.length === projectRows.length}
                                                onChange={toggleSelectAllVisible}
                                            />
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('name')}>
                                                Name <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('status')}>
                                                Status <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 font-medium">Merchandise</th>
                                        <th className="px-3 py-2 font-medium">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1"
                                                onClick={() => handleSort('created_at')}
                                            >
                                                Created <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 font-medium">Print File</th>
                                        <th className="px-3 py-2 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectRows.map((project) => (
                                        <tr key={project.id} className="border-t border-indigo-100/70 dark:border-cyan-400/10">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Select project ${project.name}`}
                                                    checked={selectedProjectIds.includes(project.id)}
                                                    onChange={() => toggleSelectProject(project.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-medium">{project.name}</td>
                                            <td className="px-3 py-2 capitalize">{project.status}</td>
                                            <td className="px-3 py-2">{getScratchMerchandise(project?.scratch_layout) || '-'}</td>
                                            <td className="px-3 py-2">
                                                {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {role === 'freelancer' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                                        disabled={downloadingProjectId === project.id}
                                                        onClick={() => handleDownloadFile(project)}
                                                    >
                                                        <Download className="mr-1 h-3.5 w-3.5" />
                                                        {downloadingProjectId === project.id ? 'Preparing…' : '360 DPI'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                                        disabled={downloadingProjectId === project.id}
                                                        onClick={() => handleDownloadFile(project)}
                                                    >
                                                        <Lock className="mr-1 h-3.5 w-3.5" />
                                                        {downloadingProjectId === project.id ? 'Processing…' : 'Unlock'}
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => handleViewProject(project.id)}>
                                                        <Eye className="mr-1 h-4 w-4" />
                                                        View
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleEditProject(project)}>
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteProject(project)}>
                                                        <Trash2 className="mr-1 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                    {!tableLoading && projectRows.length > 0 ? (
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <p>
                                Page {pagination.current_page} of {pagination.last_page}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => void fetchProjects(pagination.current_page - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pagination.current_page >= pagination.last_page}
                                    onClick={() => void fetchProjects(pagination.current_page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
                    {error ? <p className="mt-3 text-sm text-red-600" role="alert">{error}</p> : null}
                </CardContent>
            </Card>

            <Dialog.Root
                open={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open) resetCreateForm();
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(92vh,940px)] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-indigo-200/70 bg-white p-5 shadow-xl dark:border-cyan-400/20 dark:bg-slate-900">
                        <Dialog.Title className="text-lg font-semibold">Create New Project</Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Add merchandise and optional job details. Country code comes from Settings.
                        </Dialog.Description>
                        <form onSubmit={handleCreateProject} className="mt-4">
                            <div className="grid min-w-0 gap-6 lg:grid-cols-5 lg:gap-8">
                                <div className="min-w-0 space-y-3 lg:col-span-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="project-merchandise-search">Merchandise</Label>
                                        <Input
                                            id="project-merchandise-search"
                                            value={merchandiseQuery}
                                            onChange={(event) => setMerchandiseQuery(event.target.value)}
                                            placeholder="Type merchandise (e.g. t-shirt, mug, cap)..."
                                        />
                                        <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
                                            <div className="flex flex-wrap gap-2">
                                                {filteredMerchandise.map((item) => (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => handleMerchandisePick(item)}
                                                        className={`rounded-full border px-2 py-1 text-xs ${
                                                            selectedMerchandise === item
                                                                ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-200'
                                                                : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'
                                                        }`}
                                                    >
                                                        {item}
                                                    </button>
                                                ))}
                                                {merchandiseQuery.trim() &&
                                                !MERCHANDISE_OPTIONS.some(
                                                    (opt) => opt.toLowerCase() === merchandiseQuery.trim().toLowerCase()
                                                ) ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMerchandisePick(merchandiseQuery.trim())}
                                                        className="rounded-full border border-indigo-500 bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-200"
                                                    >
                                                        Use &quot;{merchandiseQuery.trim()}&quot;
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-300">
                                            {selectedMerchandise
                                                ? `Selected merchandise: ${selectedMerchandise}`
                                                : 'Select one merchandise type to auto-fill the project name and preview the blank template.'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-name">Name</Label>
                                        <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-client-ref">Client reference (optional)</Label>
                                        <Input
                                            id="project-client-ref"
                                            value={clientReference}
                                            onChange={(event) => setClientReference(event.target.value)}
                                            placeholder="PO number, SKU, buyer name..."
                                            maxLength={160}
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="project-delivery-date">Target delivery (optional)</Label>
                                            <Input
                                                id="project-delivery-date"
                                                type="date"
                                                value={targetDeliveryDate}
                                                onChange={(event) => setTargetDeliveryDate(event.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="project-priority">Priority</Label>
                                            <select
                                                id="project-priority"
                                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                                                value={priority}
                                                onChange={(event) => setPriority(event.target.value)}
                                            >
                                                <option value="low">Low</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-qty">Estimated quantity (optional)</Label>
                                        <Input
                                            id="project-qty"
                                            type="number"
                                            min={1}
                                            inputMode="numeric"
                                            value={estimatedQuantity}
                                            onChange={(event) => setEstimatedQuantity(event.target.value)}
                                            placeholder="e.g. 250"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-notes">Internal notes (optional)</Label>
                                        <Textarea
                                            id="project-notes"
                                            value={internalNotes}
                                            onChange={(event) => setInternalNotes(event.target.value)}
                                            placeholder="Production notes visible to your team..."
                                            rows={3}
                                            maxLength={5000}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-preset">Starter Template</Label>
                                        <select
                                            id="project-preset"
                                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                                            value={presetId}
                                            onChange={(event) => setPresetId(event.target.value)}
                                        >
                                            {presets.length > 0 ? (
                                                presets.map((preset) => (
                                                    <option key={preset.id} value={preset.id}>
                                                        {preset.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No preset available</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex min-w-0 flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-700 lg:col-span-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Merchandise blank preview</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Updates when you choose or type a merchandise type.
                                        </p>
                                    </div>
                                    {renderMerchandiseBlankPreview(selectedMerchandise)}
                                    <p className="text-xs text-slate-500 dark:text-slate-300">
                                        Preview name:&nbsp;
                                        <span className="font-medium">
                                            {name.trim() ||
                                                (selectedMerchandise ? `${selectedMerchandise} Project` : 'Project name will appear here')}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Project'}
                                </Button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={Boolean(viewProject)} onOpenChange={(open) => (!open ? setViewProject(null) : null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(92vh,880px)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-indigo-200/70 bg-white p-5 shadow-xl dark:border-cyan-400/20 dark:bg-slate-900">
                        <Dialog.Title className="text-lg font-semibold">Project Details</Dialog.Title>
                        {viewProject ? (
                            <div className="mt-3 space-y-3 text-sm">
                                <p>
                                    <span className="font-medium">Name:</span> {viewProject.name}
                                </p>
                                <p>
                                    <span className="font-medium">Status:</span> {viewProject.status}
                                </p>
                                <p>
                                    <span className="font-medium">Country:</span> {viewProject.country_code}
                                </p>
                                <p>
                                    <span className="font-medium">Merchandise:</span>{' '}
                                    {getScratchMerchandise(viewProject?.scratch_layout) || 'Not specified'}
                                </p>
                                {viewProject.scratch_layout?.client_reference ? (
                                    <p>
                                        <span className="font-medium">Client reference:</span>{' '}
                                        {viewProject.scratch_layout.client_reference}
                                    </p>
                                ) : null}
                                {viewProject.scratch_layout?.priority ? (
                                    <p className="capitalize">
                                        <span className="font-medium">Priority:</span> {viewProject.scratch_layout.priority}
                                    </p>
                                ) : null}
                                {viewProject.scratch_layout?.estimated_quantity ? (
                                    <p>
                                        <span className="font-medium">Estimated quantity:</span>{' '}
                                        {viewProject.scratch_layout.estimated_quantity}
                                    </p>
                                ) : null}
                                {viewProject.scratch_layout?.target_delivery_date ? (
                                    <p>
                                        <span className="font-medium">Target delivery:</span>{' '}
                                        {viewProject.scratch_layout.target_delivery_date}
                                    </p>
                                ) : null}
                                {viewProject.scratch_layout?.internal_notes ? (
                                    <p className="whitespace-pre-wrap">
                                        <span className="font-medium">Internal notes:</span>
                                        {'\n'}
                                        {viewProject.scratch_layout.internal_notes}
                                    </p>
                                ) : null}
                                <p>
                                    <span className="font-medium">Created:</span>{' '}
                                    {viewProject.created_at ? new Date(viewProject.created_at).toLocaleString() : '-'}
                                </p>
                                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                        Saved design preview
                                    </p>
                                    <ScratchLayoutPreview
                                        key={viewProject.id}
                                        scratchLayout={viewProject.scratch_layout}
                                        merchandiseFallback={getScratchMerchandise(viewProject?.scratch_layout) || ''}
                                    />
                                </div>
                            </div>
                        ) : null}
                        <div className="mt-4 flex justify-end">
                            <Button type="button" variant="outline" onClick={() => setViewProject(null)}>
                                Close
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
