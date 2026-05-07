import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimeDraftEditorPage } from './PrimeDraftEditorPage';

describe('PrimeDraftEditorPage', () => {
    test('toggles split preview visibility', async () => {
        const user = userEvent.setup();

        render(<PrimeDraftEditorPage />);

        expect(screen.getByText('AI High-Fidelity Preview')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Disable Split Preview' }));
        expect(screen.queryByText('AI High-Fidelity Preview')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Enable Split Preview' }));
        expect(screen.getByText('AI High-Fidelity Preview')).toBeInTheDocument();
    });

    test('calls generate actions from AI panel buttons', async () => {
        const user = userEvent.setup();
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<PrimeDraftEditorPage />);

        await user.click(screen.getByRole('button', { name: 'Generate Design' }));
        expect(alertSpy).toHaveBeenCalledWith('Trigger /api/projects/{id}/generations');

        await user.click(screen.getByRole('button', { name: 'Generate Similar' }));
        expect(alertSpy).toHaveBeenCalledWith('Trigger similar generation prompt');

        alertSpy.mockRestore();
    });
});
