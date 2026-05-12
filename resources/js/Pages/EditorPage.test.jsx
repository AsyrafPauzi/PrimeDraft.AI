import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EditorPage } from './EditorPage';
import * as api from '../lib/api';

vi.mock('../Components/Editor/FabricMerchEditor', () => ({
    FabricMerchEditor: React.forwardRef(function MockFabric(_props, ref) {
        React.useImperativeHandle(ref, () => ({
            addText: vi.fn(),
            addImageFromUrl: vi.fn(),
            flush: vi.fn(),
            getFabricJson: vi.fn(() => ({ objects: [{ type: 'rect' }], version: '5.3.0' })),
            loadFromJSON: vi.fn(() => Promise.resolve()),
            importLegacyLayers: vi.fn(() => Promise.resolve()),
            selectLayerById: vi.fn(),
            clearFabricSelection: vi.fn(),
            removeLayerById: vi.fn(() => true),
            reorderLayersByIds: vi.fn(),
            setLayerLocked: vi.fn(),
            setLayerHidden: vi.fn(),
            deleteActiveSelection: vi.fn(() => false),
            nudgeActive: vi.fn(() => false),
            updateTextLayer: vi.fn(),
            exportCanvasJson: vi.fn(),
            exportPngPreview: vi.fn(),
            runHighFidelity: vi.fn(),
            exportFinalPng: vi.fn(),
        }));
        return <div data-testid="fabric-mock" />;
    }),
}));

vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        getSplitPreview: vi.fn().mockResolvedValue({ generated: { output_url: null } }),
        saveScratchLayout: vi.fn().mockResolvedValue({
            project: { id: 99, scratch_layout: { version: 1, merchandise: 'T-Shirt', sides: { 'Front side': { layers: [] } } } },
        }),
        runProjectPreflight: vi.fn().mockResolvedValue({
            preflight: { status: 'ok', issues: [], profile: 'dtf', profile_label: 'DTF' },
            project: { id: 99, print_profile: 'dtf', scratch_layout: { version: 1, merchandise: 'T-Shirt' } },
        }),
        generateCanvasImage: vi.fn().mockResolvedValue({
            data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        }),
        pipelineUpscale: vi.fn().mockResolvedValue({
            data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        }),
        pipelineRemoveBackground: vi.fn().mockResolvedValue({
            data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        }),
        pipelineTo300Dpi: vi.fn().mockResolvedValue({
            data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        }),
        pipelineVectorize: vi.fn().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>' }),
    };
});

function renderEditor(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('EditorPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('toolbar shows Edit and Preview garment modes when a project is open', () => {
        renderEditor(
            <EditorPage
                token="token-1"
                selectedProjectId={99}
                selectedProject={{ id: 99, name: 'Test', scratch_layout: { version: 1, merchandise: 'T-Shirt' } }}
            />
        );
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    });

    test('Validate print rules in AI panel runs server preflight', async () => {
        const user = userEvent.setup();
        renderEditor(
            <EditorPage
                token="token-1"
                selectedProjectId={99}
                selectedProject={{
                    id: 99,
                    name: 'Test',
                    scratch_layout: { version: 1, merchandise: 'T-Shirt', sides: { 'Front side': { layers: [] } } },
                }}
                onProjectFieldsUpdate={vi.fn()}
            />
        );
        await user.click(screen.getByRole('button', { name: 'AI Design' }));
        await user.click(screen.getByRole('button', { name: 'Validate print rules' }));
        await waitFor(() => expect(api.runProjectPreflight).toHaveBeenCalled());
    });

    test('AI Design panel lists canvas export actions', async () => {
        const user = userEvent.setup();
        renderEditor(<EditorPage token="token-1" selectedProjectId={99} />);

        await user.click(screen.getByRole('button', { name: 'AI Design' }));

        expect(screen.getByRole('button', { name: 'Export canvas JSON' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Export PNG preview' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'AI: high fidelity' })).toBeInTheDocument();
        expect(screen.getByLabelText('Prompt for high-fidelity')).toBeInTheDocument();
    });

    test('applies template from asset library', async () => {
        const user = userEvent.setup();
        renderEditor(
            <EditorPage
                token="token-1"
                selectedProjectId={99}
                selectedProject={{ id: 99, name: 'Test', scratch_layout: { version: 1, merchandise: 'T-Shirt' } }}
                onProjectFieldsUpdate={vi.fn()}
            />
        );

        await user.click(screen.getByRole('button', { name: 'My templates' }));
        await user.click(screen.getByRole('button', { name: /Streetwear Drop/i }));

        expect(screen.getByText(/Template applied: Streetwear Drop/i)).toBeInTheDocument();
    });
});
