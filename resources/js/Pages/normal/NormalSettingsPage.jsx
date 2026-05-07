import React from 'react';
import { SettingsPage } from '../SettingsPage';

export function NormalSettingsPage({ focusUpgrade, ...props }) {
    return <SettingsPage {...props} focusUpgrade={Boolean(focusUpgrade)} />;
}
