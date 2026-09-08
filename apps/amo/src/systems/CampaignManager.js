import { questManager as realQuestManager } from './QuestManager.js';
import { playerStats as realPlayerStats } from './PlayerStats.js';
import { getCampaign } from '../data/campaigns/index.js';

const DEFAULT_CAMPAIGN_ID = 'eldorias_prophecy';

/**
 * Reads a campaign definition and answers three questions the engine needs:
 * what chapter is the player on, can they enter a given map, and is a given
 * chapter done. It observes QuestManager's event stream — it never starts
 * or advances a quest itself, and QuestManager has no idea this class
 * exists.
 *
 * Constructor takes fixture-injectable dependencies so this class is fully
 * unit-testable against fake campaigns/quest managers, independent of the
 * real Eldoria's Prophecy content. The module-level `campaignManager`
 * export below is the one real callers use.
 */
export class CampaignManager {
    constructor({ campaign, questManager = realQuestManager, playerStats = realPlayerStats } = {}) {
        this._campaign = campaign ?? null;
        this._questManager = questManager;
        this._playerStats = playerStats;
        this._questManager.onQuestEvent(() => this._recheck());
    }

    /** Ensures playerStats.campaign is a valid progress record for this
     * campaign, creating or repairing it as needed. Never throws. */
    _ensureProgress() {
        if (!this._campaign) return null;
        const validIds = new Set(this._campaign.chapters.map(c => c.id));
        let p = this._playerStats.campaign;

        const sameCampaign = p && p.id === this._campaign.id;
        const completed = sameCampaign ? (p.completed ?? []) : [];
        const chapterIsValid = sameCampaign && validIds.has(p.chapter);

        if (!sameCampaign || !chapterIsValid) {
            // No progress yet, or a save referencing a chapter this
            // definition no longer has — fall back to the first chapter
            // not already recorded complete, rather than throwing.
            const next = this._campaign.chapters.find(c => !completed.includes(c.id));
            p = {
                id: this._campaign.id,
                chapter: next ? next.id : null,
                completed,
            };
            this._playerStats.campaign = p;
        }
        return p;
    }

    /** The chapter object the player is currently on, or null if the
     * campaign is finished or absent. */
    currentChapter() {
        if (!this._campaign) return null;
        const progress = this._ensureProgress();
        if (!progress || !progress.chapter) return null;
        return this._campaign.chapters.find(c => c.id === progress.chapter) ?? null;
    }

    /** The earliest chapter that claims mapId, or null if no chapter does
     * (an unclaimed map — a sandbox/dev map — is always enterable). */
    chapterFor(mapId) {
        if (!this._campaign) return null;
        return this._campaign.chapters.find(c => c.maps.includes(mapId)) ?? null;
    }

    /** True once every quest listed on the given chapter is complete. A
     * fresh poll every time, never cached — see the module header note on
     * why that matters for out-of-order quest completion. */
    isChapterComplete(chapterId) {
        if (!this._campaign) return false;
        const chapter = this._campaign.chapters.find(c => c.id === chapterId);
        if (!chapter) return false;
        return chapter.quests.every(qid => this._questManager.isCompleted(qid));
    }

    /** { allowed: boolean, reason: string|null } for entering mapId. */
    canEnter(mapId) {
        const chapter = this.chapterFor(mapId);
        if (!chapter) return { allowed: true, reason: null };

        const progress = this._ensureProgress();
        const idx = this._campaign.chapters.findIndex(c => c.id === chapter.id);
        const earlierChapters = this._campaign.chapters.slice(0, idx);
        const allEarlierDone = earlierChapters.every(
            c => (progress?.completed ?? []).includes(c.id) || this.isChapterComplete(c.id)
        );

        if (allEarlierDone) return { allowed: true, reason: null };
        return { allowed: false, reason: `The way to ${chapter.title} is not yet open.` };
    }

    /** Re-evaluates the current chapter on every quest event, granting
     * unlocks and advancing as far as already-satisfied chapters allow —
     * see the module header for why this is a poll-and-loop, not a
     * check-the-event's-own-questId. */
    _recheck() {
        if (!this._campaign) return;
        const progress = this._ensureProgress();
        if (!progress) return;

        for (;;) {
            const current = this._campaign.chapters.find(c => c.id === progress.chapter);
            if (!current) return;
            if (progress.completed.includes(current.id)) return; // already granted
            if (!this.isChapterComplete(current.id)) return;

            for (const unlock of current.unlocks ?? []) this._grantUnlock(unlock);
            progress.completed.push(current.id);

            const idx = this._campaign.chapters.findIndex(c => c.id === current.id);
            const next = this._campaign.chapters[idx + 1];
            progress.chapter = next ? next.id : null;
            if (!next) return; // campaign finished
        }
    }

    _grantUnlock({ type, id }) {
        if (type === 'item' || type === 'weapon') this._playerStats.addItem(id);
        else if (type === 'spell') this._playerStats.forceUnlockSpell(id);
        else if (type === 'ability') this._playerStats.forceUnlockSkill(id);
    }
}

export const campaignManager = new CampaignManager({ campaign: getCampaign(DEFAULT_CAMPAIGN_ID) });
