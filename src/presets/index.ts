import blank from './blank.json';
import auth from './auth.json';
import landing from './landing.json';
import dashboard from './dashboard.json';
import settings from './settings.json';
import listDetail from './list-detail.json';

export const presets = { blank, auth, landing, dashboard, settings, 'list-detail': listDetail } as const;
export type PresetName = keyof typeof presets;
