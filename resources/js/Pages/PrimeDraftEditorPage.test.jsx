import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimeDraftEditorPage } from './PrimeDraftEditorPage';

describe('PrimeDraftEditorPage', () => {
    test('toggles split preview rail visibility', async () => {
        const user = userEvent.setup();

        render(<PrimeDraftEditorPage />);

        expect(screen.getByText('Canvas split rail')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Hide canvas split rail' }));
        expect(screen.queryByText('Canvas split rail')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Show canvas split rail' }));
        expect(screen.getByText('Canvas split rail')).toBeInTheDocument();
    });

    test('calls generate actions from AI panel buttons', async () => {
        const user = userEvent.setup();
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<PrimeDraftEditorPage />);

        await user.click(screen.getByRole('button', { name: 'Generate Design' }));
        expect(alertSpy).toHaveBeenCalledWith(
            'Demo: opens split rail + calls API twice (draft + print) in the real editor'
        );

        await user.click(screen.getByRole('button', { name: 'Generate Similar' }));
        expect(alertSpy).toHaveBeenCalledWith('Demo: split rail + one OpenAI image in the real editor');

        alertSpy.mockRestore();
    });
});
