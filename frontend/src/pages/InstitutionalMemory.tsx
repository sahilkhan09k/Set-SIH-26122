import { useState } from 'react';
import {
  Brain,
  Search,
  Sparkles,
  FileText,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

interface KnowledgeResult {
  query: string;
  summary: string;
  confidence: number;
  sources: {
    docName: string;
    date: string;
    snippet: string;
    section: string;
  }[];
  relatedActivities: string[];
}

const PRESET_QUERIES: Record<string, KnowledgeResult> = {
  'Why was the Cable Tray installation at Substation S2 delayed?': {
    query: 'Why was the Cable Tray installation at Substation S2 delayed?',
    summary:
      'Cable Tray installation at Substation S2 (ELE-S201) was delayed by 1 day starting on 21 Sep 2026 instead of 20 Sep 2026 due to pending civil handover of the transformer plinth area and conflicting conduit placement by the civil subcontractor. Crew executed 35m of 120m total planned scope during the day shift.',
    confidence: 94,
    sources: [
      {
        docName: 'DPR_21Sep2026_ShiftA.txt',
        date: '21 Sep 2026',
        snippet: 'Cable tray installation started in Substation S2. Approximately 35 metres installed after civil handover was cleared at 08:00.',
        section: 'Section 4.2 - Electrical Works',
      },
      {
        docName: 'Site_Coordination_Minutes_20Sep.pdf',
        date: '20 Sep 2026',
        snippet: 'Civil team F-204 curing delayed access to Substation S2 trench until Monday morning 07:30.',
        section: 'Item 3 - Inter-discipline Access',
      },
    ],
    relatedActivities: ['ELE-S201', 'CIV-2041', 'ELE-S202'],
  },
  'Show all concrete foundation pours completed in September 2026.': {
    query: 'Show all concrete foundation pours completed in September 2026.',
    summary:
      'In September 2026, two major foundation pours were executed: Foundation F-204 (CIV-2041) completed 45 CUM on 21 Sep 2026 with full slump compliance, and Equipment Foundation F-202 completed 52 CUM on 12 Sep 2026. Both are now cured and ready for structural steel erection.',
    confidence: 98,
    sources: [
      {
        docName: 'Daily_Progress_Report_21Sep2026.txt',
        date: '21 Sep 2026',
        snippet: 'Foundation F-204 concreting completed. Work started at 09:00 and finished at 15:30. Total poured: 45 CUM.',
        section: 'Section 2 - Civil Foundation Log',
      },
      {
        docName: 'Civil_Foundation_Inspection_Batch1.xlsx',
        date: '12 Sep 2026',
        snippet: 'F-202 Equipment Pad: 52 CUM M35 grade concrete poured. Core compression tests verified.',
        section: 'Pour Log 09-12',
      },
    ],
    relatedActivities: ['CIV-2041', 'CIV-2042'],
  },
  'Which contractor handled the 8-inch process line at Rack R24?': {
    query: 'Which contractor handled the 8-inch process line at Rack R24?',
    summary:
      'The 8-inch process line erection at Rack R24 (PIP-2401) is executed by L&T Hydrocarbon piping gang led by Foreman Rajesh K. Spool P24-17 was lifted via Crane CR-02 and tack welded on 21 Sep 2026.',
    confidence: 92,
    sources: [
      {
        docName: 'DPR_21Sep2026_ShiftA_Piping.txt',
        date: '21 Sep 2026',
        snippet: 'Team completed erection of 8 inch process line at Rack R24. 42 inch-dia installed during day shift by L&T crew.',
        section: 'Shift Roster & Piping Erection',
      },
    ],
    relatedActivities: ['PIP-2401', 'PIP-2402'],
  },
};

export default function InstitutionalMemory() {
  const [searchInput, setSearchInput] = useState('Why was the Cable Tray installation at Substation S2 delayed?');
  const [activeResult, setActiveResult] = useState<KnowledgeResult | null>(
    PRESET_QUERIES['Why was the Cable Tray installation at Substation S2 delayed?']
  );
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (queryText: string) => {
    setSearchInput(queryText);
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      if (PRESET_QUERIES[queryText]) {
        setActiveResult(PRESET_QUERIES[queryText]);
      } else {
        // Fallback realistic synthesis
        setActiveResult({
          query: queryText,
          summary: `SETU Institutional Semantic Index retrieved 3 relevant log entries matching "${queryText}". Activities cross-referenced across daily site reports and P6 schedule baseline indicate alignment with discipline standards and safety clearances.`,
          confidence: 88,
          sources: [
            {
              docName: 'Daily_Progress_Report_21Sep2026.txt',
              date: '21 Sep 2026',
              snippet: 'Relevant excerpt matching field parameters recorded during shift handover.',
              section: 'General Site Log',
            },
          ],
          relatedActivities: ['PIP-2401', 'ELE-S201'],
        });
      }
    }, 600);
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Institutional Memory & RAG Knowledge Retrieval</h1>
          <p className="page-subtitle">
            Query past construction events, schedule variances, subcontractor performance, and field logs using natural language.
          </p>
        </div>
      </div>

      {/* Query Box */}
      <div className="card section" style={{ background: 'linear-gradient(135deg, rgba(22,30,53,0.8), rgba(15,22,41,0.9))', borderColor: 'var(--accent-border)' }}>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchInput);
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <div className="search-input-wrap" style={{ flex: 1 }}>
              <Search size={18} className="search-icon" color="var(--accent)" />
              <input
                type="text"
                className="search-input"
                style={{ height: '44px', fontSize: '14px', paddingLeft: '40px' }}
                placeholder="Ask anything (e.g. Why was Cable Tray delayed? Who poured Foundation F-204?)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }} disabled={isSearching}>
              {isSearching ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />} {isSearching ? 'Searching...' : 'Query Memory'}
            </button>
          </form>

          {/* Quick Prompts */}
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Suggested Queries:
            </span>
            {Object.keys(PRESET_QUERIES).map((q) => (
              <button
                key={q}
                className="chip"
                style={{ cursor: 'pointer', background: searchInput === q ? 'var(--accent-dim)' : undefined, color: searchInput === q ? 'var(--accent)' : undefined }}
                onClick={() => handleSearch(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Section */}
      {activeResult && (
        <div className="section">
          {/* Synthesis Card */}
          <div className="card" style={{ marginBottom: '16px', borderColor: 'rgba(59,130,246,0.3)' }}>
            <div className="card-header" style={{ background: 'rgba(59,130,246,0.06)' }}>
              <div className="card-title">
                <Brain size={18} color="var(--accent)" />
                AI Institutional Knowledge Synthesis
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="chip" style={{ color: 'var(--success)', borderColor: 'var(--success-border)' }}>
                  Confidence: {activeResult.confidence}%
                </span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {activeResult.summary}
              </p>

              {/* Related Activities */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Linked P6 Activities:</span>
                {activeResult.relatedActivities.map((act) => (
                  <span key={act} className="chip td-mono" style={{ color: 'var(--accent)' }}>
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Supporting Evidence Citations */}
          <div className="section-header">
            <div className="section-title">
              <BookOpen size={14} /> Supporting Documents & Field Citations ({activeResult.sources.length})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {activeResult.sources.map((src, idx) => (
              <div key={idx} className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                    <FileText size={14} color="var(--accent)" />
                    {src.docName}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{src.date}</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '6px', fontWeight: 500 }}>
                    {src.section}
                  </div>
                  <blockquote
                    style={{
                      borderLeft: '3px solid var(--accent)',
                      paddingLeft: '12px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}
                  >
                    "{src.snippet}"
                  </blockquote>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
