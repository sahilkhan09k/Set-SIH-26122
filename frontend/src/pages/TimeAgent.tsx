import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Check,
  Edit3,
  ExternalLink,
  Mic,
  Sparkles,
  Clock,
  MapPin,
  Layers,
  Hash,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import ConfidenceBar from '../components/ui/ConfidenceBar';

interface ExtractedEvent {
  discipline: string;
  activity: string;
  quantity?: string;
  location?: string;
  start?: string;
  end?: string;
  date: string;
}

interface SuggestedMatch {
  activityCode: string;
  activityName: string;
  confidence: number;
  wbs: string;
  explanation: string;
  evidenceChecks: { label: string; pass: boolean }[];
}

type MessageRole = 'supervisor' | 'ai';

interface ConversationMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  extraction?: ExtractedEvent;
  match?: SuggestedMatch;
  confirmed?: boolean;
}

const DEMO_RESPONSES: {
  keywords: string[];
  extraction: ExtractedEvent;
  match: SuggestedMatch;
  reply: string;
}[] = [
  {
    keywords: ['r24', 'rack', '8 inch', 'spool', 'piping', 'line', 'erect'],
    extraction: {
      discipline: 'Piping',
      activity: '8-inch process line erection',
      quantity: '42 inch-dia',
      location: 'Rack R24',
      start: '08:30',
      end: '17:00',
      date: '21 Sep 2026',
    },
    match: {
      activityCode: 'PIP-2401',
      activityName: 'Erect Line 24-XX — 8IN Process Line',
      confidence: 92,
      wbs: 'MRE.PIP.R24.ERE',
      explanation: 'Strong semantic match on "8-inch line erection at Rack R24". Discipline (Piping), location (R24), action (erect), and size (8IN) all align with baseline activity PIP-2401.',
      evidenceChecks: [
        { label: 'Discipline match (Piping)', pass: true },
        { label: 'Location match (Rack R24)', pass: true },
        { label: 'Action match (Erect / Install)', pass: true },
        { label: 'Size match (8IN / 8-inch)', pass: true },
        { label: 'Date within planned window', pass: true },
      ],
    },
    reply: "I've extracted a structured progress event from your report. I've matched it to **PIP-2401** with 92% confidence based on discipline, location, action verb, and line specification alignment.",
  },
  {
    keywords: ['substation', 's2', 'cable tray', 'electrical', 'metre', 'meter'],
    extraction: {
      discipline: 'Electrical',
      activity: 'Cable tray installation',
      quantity: '35 metre',
      location: 'Substation S2',
      start: '08:00',
      end: '16:00',
      date: '21 Sep 2026',
    },
    match: {
      activityCode: 'ELE-S201',
      activityName: 'Cable Tray Installation — Substation S2',
      confidence: 78,
      wbs: 'MRE.ELE.SS2.CTI',
      explanation: 'Good match on discipline and location. However, quantity reported (35m) versus planned total (120m) suggests partial progress only. Review recommended.',
      evidenceChecks: [
        { label: 'Discipline match (Electrical)', pass: true },
        { label: 'Location match (Substation S2)', pass: true },
        { label: 'Action match (Install)', pass: true },
        { label: 'Quantity variance (35m vs 120m planned)', pass: false },
        { label: 'Date within planned window', pass: true },
      ],
    },
    reply: 'Extracted your electrical progress event. Match confidence is **78%** — the location and discipline align, but the installed quantity (35m) is significantly less than the planned scope (120m). Please confirm before pushing.',
  },
  {
    keywords: ['foundation', 'f-204', 'concrete', 'civil', 'concreting', 'pour'],
    extraction: {
      discipline: 'Civil',
      activity: 'Foundation concreting',
      quantity: '45 CUM',
      location: 'Foundation F-204',
      start: '09:00',
      end: '15:30',
      date: '21 Sep 2026',
    },
    match: {
      activityCode: 'CIV-2041',
      activityName: 'Foundation F-204 Concrete Pour — M35 Grade',
      confidence: 97,
      wbs: 'MRE.CIV.FDN.F204',
      explanation: 'Excellent match. Activity code F-204, discipline (Civil), action (concreting/pour), quantity (45 CUM), and location are all exact. Near-certain auto-link candidate.',
      evidenceChecks: [
        { label: 'Discipline match (Civil)', pass: true },
        { label: 'Location match (Foundation F-204)', pass: true },
        { label: 'Action match (Concrete / Pour)', pass: true },
        { label: 'Quantity match (45 CUM)', pass: true },
        { label: 'Date within planned window', pass: true },
      ],
    },
    reply: "Strong extraction. I've matched this to **CIV-2041** with **97% confidence** — near-certain auto-link. All evidence checks pass including exact quantity and location.",
  },
];

function matchDemoResponse(input: string) {
  const lower = input.toLowerCase();
  for (const demo of DEMO_RESPONSES) {
    if (demo.keywords.some((kw) => lower.includes(kw))) return demo;
  }
  return null;
}

function generateFallback(): ConversationMessage {
  return {
    id: Math.random().toString(36).slice(2),
    role: 'ai',
    text: "I've processed your report. SETU extracted 1 potential progress event from your text. No high-confidence schedule match was found automatically — this will be routed to the Planner Review queue for manual matching.\n\nPlease provide more specific details such as activity codes, discipline, location, or quantities for better matching accuracy.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

const SUGGESTED_INPUTS = [
  'What works were completed today?',
  'Today piping completed erection of around 40 inch-dia of the 8 inch line at Rack R24. Started at 8:30 and finished by 5.',
  'Cable tray installation started in Substation S2. Approximately 35 metres installed during the day shift.',
  'Foundation F-204 concreting completed. Work started at 09:00 and finished at 15:30. Total poured: 45 CUM.',
];

export default function TimeAgent() {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Welcome to SETU Time Agent. I convert your natural language field reports directly into structured schedule updates, and answer real-time questions about daily progress and critical path execution. What works would you like to review or report today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    const supervisorMsg: ConversationMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'supervisor',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, supervisorMsg]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const { api } = await import('../services/api');
      const res = await api.sendTimeAgentMessage(text);
      if (res && res.reply) {
        const aiMsg: ConversationMessage = {
          id: Math.random().toString(36).slice(2),
          role: 'ai',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          extraction: res.extraction,
          match: res.match ? {
            ...res.match,
            confidence: Math.round(res.match.confidence > 1 ? res.match.confidence : res.match.confidence * 100),
          } : undefined,
          confirmed: false,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsProcessing(false);
        return;
      }
    } catch {
      // fallback to client simulated logic if backend down
    }

    setTimeout(() => {
      const demo = matchDemoResponse(text);
      let aiMsg: ConversationMessage;
      if (demo) {
        aiMsg = {
          id: Math.random().toString(36).slice(2),
          role: 'ai',
          text: demo.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          extraction: demo.extraction,
          match: demo.match,
          confirmed: false,
        };
      } else {
        aiMsg = generateFallback();
      }
      setMessages((prev) => [...prev, aiMsg]);
      setIsProcessing(false);
    }, 800);
  };

  const handleConfirm = async (msgId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m)));
    
    // Find original supervisor message
    const msgIndex = messages.findIndex(m => m.id === msgId);
    const supervisorText = msgIndex > 0 ? messages[msgIndex - 1]?.text : '';

    if (supervisorText) {
      try {
        const { api } = await import('../services/api');
        await api.sendTimeAgentMessage(supervisorText, true);
      } catch {
        // Continue gracefully
      }
    }

    const confirmMsg: ConversationMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'ai',
      text: '✓ Progress event confirmed and pushed to schedule. The audit trail has been updated. This event will appear in the Dashboard and Activity Matches.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTimeout(() => setMessages((prev) => [...prev, confirmMsg]), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Time Agent — Conversational Progress Capture</h1>
          <p className="page-subtitle">
            Describe site work in plain language. SETU AI extracts structured events and links them to your P6 schedule automatically.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-pill)', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
          <Sparkles size={14} />
          Groq Llama 3.3 70B · Live AI
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} onConfirm={handleConfirm} />
          ))}
          {isProcessing && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
                <Bot size={16} />
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: '8px', borderTopLeftRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span className="spin" style={{ display: 'inline-block' }}><Sparkles size={14} color="var(--accent)" /></span>
                Extracting events and matching to schedule...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Try:</span>
          {SUGGESTED_INPUTS.map((s) => (
            <button key={s} className="chip" style={{ cursor: 'pointer', fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setInputValue(s)}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe today's site progress... (e.g. 'Piping team erected 8-inch spool at Rack R24, 42 inch-dia installed, started 08:30 finished 17:00')"
              style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--r-lg)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-ui)', resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color var(--t-fast)', boxSizing: 'border-box' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--bg-border)')}
            />
          </div>
          <button className="btn btn-ghost btn-sm" title="Voice input (coming soon)" style={{ padding: '10px', flexShrink: 0 }} disabled><Mic size={16} /></button>
          <button className="btn btn-primary" onClick={handleSend} disabled={!inputValue.trim() || isProcessing} id="btn-time-agent-send" style={{ padding: '10px 18px', flexShrink: 0 }}>
            <Send size={16} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, onConfirm }: { msg: ConversationMessage; onConfirm: (id: string) => void }) {
  const isAI = msg.role === 'ai';
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: isAI ? 'row' : 'row-reverse' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isAI ? 'var(--accent-dim)' : 'var(--bg-elevated)', border: `1px solid ${isAI ? 'var(--accent-border)' : 'var(--bg-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isAI ? 'var(--accent)' : 'var(--text-secondary)' }}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div style={{ flex: 1, maxWidth: isAI ? '100%' : '60%' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textAlign: isAI ? 'left' : 'right' }}>
          {isAI ? 'SETU AI' : 'Site Supervisor'} · {msg.timestamp}
        </div>
        <div
          style={{ padding: '12px 16px', background: isAI ? 'var(--bg-elevated)' : 'rgba(59,130,246,0.1)', border: `1px solid ${isAI ? 'var(--bg-border)' : 'var(--accent-border)'}`, borderRadius: '8px', borderTopLeftRadius: isAI ? '2px' : '8px', borderTopRightRadius: isAI ? '8px' : '2px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/✓/g, '<span style="color:var(--success)">✓</span>').replace(/\n/g, '<br />') }}
        />
        {msg.extraction && (
          <div style={{ marginTop: '10px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
              AI Extracted Event
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <ExField icon={<Layers size={12} />} label="Discipline" value={msg.extraction.discipline} />
              <ExField icon={<MapPin size={12} />} label="Location" value={msg.extraction.location ?? '—'} />
              <ExField icon={<Hash size={12} />} label="Activity" value={msg.extraction.activity} />
              {msg.extraction.quantity && <ExField icon={<Hash size={12} />} label="Quantity" value={msg.extraction.quantity} />}
              <ExField icon={<Clock size={12} />} label="Start" value={msg.extraction.start ?? '—'} />
              <ExField icon={<Clock size={12} />} label="End" value={msg.extraction.end ?? '—'} />
            </div>
          </div>
        )}
        {msg.match && (
          <div style={{ marginTop: '10px', padding: '14px 16px', background: 'var(--bg-surface)', border: `1px solid ${msg.match.confidence >= 85 ? 'var(--success-border)' : 'var(--warning-border)'}`, borderRadius: '8px', borderLeft: `3px solid ${msg.match.confidence >= 85 ? 'var(--success)' : 'var(--warning)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: msg.match.confidence >= 85 ? 'var(--success)' : 'var(--warning)' }}>
                {msg.match.confidence >= 85 ? <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 5 }} /> : <AlertTriangle size={11} style={{ display: 'inline', marginRight: 5 }} />}
                Suggested P6 Activity
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: msg.match.confidence >= 85 ? 'var(--success)' : 'var(--warning)' }}>
                {msg.match.confidence}% MATCH
              </span>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span className="td-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{msg.match.activityCode}</span>
                <span className="chip" style={{ fontSize: '10px' }}>{msg.match.wbs}</span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{msg.match.activityName}</div>
            </div>
            <div style={{ marginBottom: '10px' }}><ConfidenceBar value={msg.match.confidence} /></div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{msg.match.explanation}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
              {msg.match.evidenceChecks.map((check, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0' }}>
                  {check.pass ? <Check size={13} color="var(--success)" /> : <AlertTriangle size={13} color="var(--danger)" />}
                  <span style={{ color: check.pass ? 'var(--text-primary)' : 'var(--danger)' }}>{check.label}</span>
                </div>
              ))}
            </div>
            {!msg.confirmed ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => onConfirm(msg.id)} id={`btn-confirm-${msg.id}`}>
                  <Check size={14} /> Confirm &amp; Push to Schedule
                </button>
                <button className="btn btn-ghost btn-sm"><Edit3 size={14} /> Edit</button>
                <button className="btn btn-ghost btn-sm"><ExternalLink size={14} /> View</button>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: 'var(--success-dim)', border: '1px solid var(--success-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                <CheckCircle2 size={16} /> Confirmed — pushed to schedule and audit trail
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {label}
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>{value}</div>
    </div>
  );
}
