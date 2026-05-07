import React from 'react';
import { ProjectsPage } from '../ProjectsPage';
import templates from '../../data/editor/templates.json';

export function NormalProjectsPage(props) {
    return <ProjectsPage {...props} role="normal" presets={templates} />;
}
