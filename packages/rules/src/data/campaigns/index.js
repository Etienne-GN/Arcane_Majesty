import { ELDORIAS_PROPHECY } from './eldorias_prophecy.js';

const REGISTRY = {
    eldorias_prophecy: ELDORIAS_PROPHECY,
};

export function getCampaign(id) {
    return REGISTRY[id] ?? null;
}

export function listCampaigns() {
    return Object.values(REGISTRY).map(c => ({ id: c.id, title: c.title }));
}
