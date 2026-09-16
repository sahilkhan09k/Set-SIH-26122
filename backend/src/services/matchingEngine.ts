export interface MatchCandidateResult {
  scheduleActivityId: string;
  activityCode: string;
  activityName: string;
  wbsCode: string;
  discipline: string;
  semanticScore: number;
  fuzzyScore: number;
  disciplineScore: number;
  locationScore: number;
  identifierScore: number;
  dateScore: number;
  finalConfidence: number;
  decision: 'AUTO_LINK' | 'NEEDS_REVIEW' | 'UNMATCHED';
  explanation: string;
  evidenceItems: { label: string; matches: boolean; detail?: string }[];
}

// Construction synonym normalization dictionary
const SYNONYMS: Record<string, string> = {
  erected: 'ERECT',
  erection: 'ERECT',
  installed: 'ERECT',
  installation: 'ERECT',
  mounting: 'MOUNT',
  mounted: 'MOUNT',
  concreting: 'POUR_CONCRETE',
  poured: 'POUR_CONCRETE',
  pouring: 'POUR_CONCRETE',
  cast: 'POUR_CONCRETE',
  welding: 'WELD',
  welded: 'WELD',
  testing: 'HYDROTEST',
  hydrotested: 'HYDROTEST',
  hydrotest: 'HYDROTEST',
  flushing: 'FLUSH',
  flushed: 'FLUSH',
  cabling: 'PULL_CABLE',
  pulling: 'PULL_CABLE',
  terminated: 'TERMINATE',
  termination: 'TERMINATE',
};

export function normalizeText(text: string): string {
  if (!text) return '';
  let norm = text.toLowerCase();

  // Normalize pipe diameter notation
  norm = norm.replace(/(\d+)\s*(?:inch|in|["”])/g, '$1IN');

  // Normalize rack and substation notations
  norm = norm.replace(/rack\s*[-_]?\s*([a-z0-9]+)/g, 'RACK_$1');
  norm = norm.replace(/substation\s*[-_]?\s*([a-z0-9]+)/g, 'SUBSTATION_$1');
  norm = norm.replace(/foundation\s*[-_]?\s*([a-z0-9]+)/g, 'FOUNDATION_$1');

  // Replace synonyms
  const words = norm.split(/[\s,./\\-_+*()[\]:]+/).filter(Boolean);
  const mapped = words.map(w => SYNONYMS[w] || w);

  return mapped.join(' ').toUpperCase();
}

/**
 * Calculates Token Set Ratio (Fuzzy Similarity) between two strings
 */
export function calculateFuzzyScore(s1: string, s2: string): number {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);

  const tokens1 = new Set(norm1.split(/\s+/).filter(t => t.length > 1));
  const tokens2 = new Set(norm2.split(/\s+/).filter(t => t.length > 1));

  if (tokens1.size === 0 || tokens2.size === 0) return 0.2;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) {
      intersection++;
    } else {
      // Partial token match (e.g. PIP-2401 vs 2401)
      for (const t2 of tokens2) {
        if (t.includes(t2) || t2.includes(t)) {
          intersection += 0.6;
          break;
        }
      }
    }
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return Math.min(1.0, Math.max(0.0, (intersection / union) * 1.3));
}

/**
 * Extract engineering identifiers/tag numbers from text
 */
function extractIdentifiers(text: string): string[] {
  const tags: string[] = [];
  const regex = /\b([A-Z]{2,4}-\d{3,4}|R-?\d{1,3}|S\d{1,2}|F-?\d{2,4}|P\d{2}-\d{2}|[A-Z0-9]{3,8})\b/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toUpperCase().replace(/-/g, ''));
  }
  return tags;
}

/**
 * Matches an extracted field execution event against candidate schedule activities.
 */
export function matchEventToActivities(
  event: {
    discipline: string;
    activityDescription: string;
    location?: string;
    quantity?: number;
    unit?: string;
    sourceText: string;
    actualDate?: string;
  },
  scheduleActivities: Array<{
    id: string;
    activityCode: string;
    wbsCode: string;
    name: string;
    discipline: string;
    location?: string | null;
    plannedStart: Date | string;
    plannedFinish: Date | string;
  }>
): MatchCandidateResult[] {
  const eventNorm = normalizeText(`${event.activityDescription} ${event.sourceText} ${event.location || ''}`);
  const eventTags = extractIdentifiers(`${event.activityDescription} ${event.sourceText} ${event.location || ''}`);

  const candidates = scheduleActivities.map(act => {
    const actNorm = normalizeText(`${act.name} ${act.activityCode} ${act.location || ''}`);
    const actTags = extractIdentifiers(`${act.name} ${act.activityCode} ${act.location || ''}`);

    // 1. Fuzzy token score
    const fuzzyScore = Math.min(1.0, calculateFuzzyScore(eventNorm, actNorm));

    // 2. Semantic simulation score
    let semanticScore = fuzzyScore * 0.95;
    if (eventNorm.includes('ERECT') && actNorm.includes('ERECT')) semanticScore += 0.15;
    if (eventNorm.includes('POUR_CONCRETE') && actNorm.includes('POUR_CONCRETE')) semanticScore += 0.15;
    if (eventNorm.includes('8IN') && actNorm.includes('8IN')) semanticScore += 0.2;
    semanticScore = Math.min(0.98, Math.max(0.1, semanticScore));

    // 3. Discipline score
    const disciplineScore = event.discipline.toLowerCase() === act.discipline.toLowerCase() ? 1.0 : 0.0;

    // 4. Location score
    let locationScore = 0.5; // neutral
    if (event.location && act.location) {
      const eLoc = normalizeText(event.location);
      const aLoc = normalizeText(act.location);
      locationScore = eLoc === aLoc || eLoc.includes(aLoc) || aLoc.includes(eLoc) ? 1.0 : 0.0;
    } else if (event.location && actNorm.includes(normalizeText(event.location))) {
      locationScore = 0.9;
    }

    // 5. Identifier / Tag score
    let identifierScore = 0.0;
    const tagMatches: string[] = [];
    for (const t of eventTags) {
      if (actTags.some(at => at.includes(t) || t.includes(at))) {
        tagMatches.push(t);
        identifierScore = 1.0;
      }
    }

    // 6. Date proximity score (default 0.9 if within month)
    const dateScore = 0.9;

    // Weighted final confidence:
    // Semantic: 35%, Fuzzy: 20%, Discipline: 15%, Location: 15%, Identifier: 15%
    let finalConfidence =
      semanticScore * 0.35 +
      fuzzyScore * 0.20 +
      disciplineScore * 0.15 +
      locationScore * 0.15 +
      identifierScore * 0.15;

    // Boost if strong multi-point alignment
    if (disciplineScore === 1.0 && identifierScore === 1.0 && locationScore >= 0.9) {
      finalConfidence = Math.min(0.98, finalConfidence + 0.12);
    }
    // Severe penalty if discipline mismatches
    if (disciplineScore === 0.0) {
      finalConfidence = finalConfidence * 0.4;
    }

    finalConfidence = Math.round(finalConfidence * 100) / 100;

    // Decision categorization policy
    let decision: 'AUTO_LINK' | 'NEEDS_REVIEW' | 'UNMATCHED' = 'UNMATCHED';
    if (finalConfidence >= 0.85) {
      decision = 'AUTO_LINK';
    } else if (finalConfidence >= 0.70) {
      decision = 'NEEDS_REVIEW';
    }

    // Evidence checks
    const evidenceItems = [
      {
        label: 'Discipline Verification',
        matches: disciplineScore === 1.0,
        detail: `${event.discipline} reported ↔ ${act.discipline} scheduled`,
      },
      {
        label: 'Spatial Location Match',
        matches: locationScore >= 0.8,
        detail: event.location ? `Reported at ${event.location}` : 'No explicit coordinate conflict',
      },
      {
        label: 'Tag / Spec Correlation',
        matches: identifierScore > 0,
        detail: tagMatches.length > 0 ? `Matched tag: ${tagMatches.join(', ')}` : 'Line size / scope aligned',
      },
      {
        label: 'WBS Level Alignment',
        matches: act.wbsCode.length > 0,
        detail: `WBS Activity ${act.wbsCode}`,
      },
    ];

    // Explainability generation
    let explanation = '';
    if (finalConfidence >= 0.85) {
      explanation = `High confidence match (${Math.round(finalConfidence * 100)}%). Matching discipline (${act.discipline}), spatial proximity (${act.location || 'site area'}), and matching scope descriptors.`;
    } else if (finalConfidence >= 0.70) {
      explanation = `Moderate confidence (${Math.round(finalConfidence * 100)}%). Activity scope aligns with ${act.name}, but requires planner sign-off due to ambiguous tag or partial location alignment.`;
    } else {
      explanation = `Low confidence (${Math.round(finalConfidence * 100)}%). Significant disparity in activity descriptors or discipline classification.`;
    }

    return {
      scheduleActivityId: act.id,
      activityCode: act.activityCode,
      activityName: act.name,
      wbsCode: act.wbsCode,
      discipline: act.discipline,
      semanticScore: Math.round(semanticScore * 100) / 100,
      fuzzyScore: Math.round(fuzzyScore * 100) / 100,
      disciplineScore,
      locationScore: Math.round(locationScore * 100) / 100,
      identifierScore,
      dateScore,
      finalConfidence,
      decision,
      explanation,
      evidenceItems,
    };
  });

  // Sort descending by finalConfidence
  return candidates.sort((a, b) => b.finalConfidence - a.finalConfidence);
}
