import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EditorPage } from './EditorPage';
import * as api from '../lib/api';

vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        createGeneration: vi.fn().mockResolvedValue({ generation: { id: 1, status: 'queued' } }),
        getSplitPreview: vi.fn().mockResolvedValue({ generated: { output_url: null } }),
        saveScratchLayout: vi.fn().mockResolvedValue({
            project: { id: 99, scratch_layout: { version: 1, merchandise: 'T-Shirt', sides: { 'Front side': { layers: [] } } } },
        }),
        downloadHighRes: vi.fn().mockResolvedValue({ dpi: 360, download_url: 'https://example.test/high-res.png' }),
    };
});

function renderEditor(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('EditorPage', () => {
    test('queues generation when project is selected', async () => {
        const user = userEvent.setup();
        renderEditor(<EditorPage token="token-1" selectedProjectId={99} />);

        await user.click(screen.getByRole('button', { name: 'AI Design' }));
        await user.type(screen.getByLabelText('Describe your design'), 'Modern jersey layout');
        await user.click(screen.getByRole('button', { name: 'Generate Design' }));

        expect(api.createGeneration).toHaveBeenCalledWith('token-1', 99, 'Modern jersey layout');
        expect(screen.getByText(/AI generation queued/i)).toBeInTheDocument();
    });

    test('applies template from asset library', async () => {
        const user = userEvent.setup();
        renderEditor(
            <EditorPage
                token="token-1"
                selectedProjectId={99}
                selectedProject={{ id: 99, name: 'Test', scratch_layout: { version: 1, merchandise: 'T-Shirt' } }}
            />
        );

        await user.click(screen.getByRole('button', { name: 'My templates' }));
        await user.click(screen.getByRole('button', { name: /Streetwear Drop/i }));

        expect(screen.getByText(/Template applied: Streetwear Drop/i)).toBeInTheDocument();
    });

    test('generates from right AI panel prompt', async () => {
        const user = userEvent.setup();
        renderEditor(<EditorPage token="token-1" selectedProjectId={99} />);

        await user.click(screen.getByRole('button', { name: 'AI Design' }));
        await user.clear(screen.getByLabelText('Describe your design'));
        await user.type(screen.getByLabelText('Describe your design'), 'Monochrome jersey with lightning sleeve accents');
        await user.click(screen.getByRole('button', { name: 'Generate Design' }));

        expect(api.createGeneration).toHaveBeenCalledWith('token-1', 99, 'Monochrome jersey with lightning sleeve accents');
        expect(screen.getByText(/AI generation queued/i)).toBeInTheDocument();
    });

    test('downloads high-res 360 dpi from right panel', async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        renderEditor(<EditorPage token="token-1" selectedProjectId={99} />);

        await user.click(screen.getByRole('button', { name: 'AI Design' }));
        await user.click(screen.getByRole('button', { name: 'Download 360 DPI' }));

        expect(api.downloadHighRes).toHaveBeenCalledWith('token-1', 99, {
            dpi: 360,
            color_count: 6,
        });
        expect(openSpy).toHaveBeenCalledWith('https://example.test/high-res.png', '_blank', 'noopener,noreferrer');

        openSpy.mockRestore();
    });
});
