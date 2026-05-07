import React from 'react';
import { ProjectsPage } from '../ProjectsPage';
import templates from '../../data/editor/templates.json';

export function FreelancerProjectsPage(props) {
    return <ProjectsPage {...props} role="freelancer" presets={templates} />;
}
