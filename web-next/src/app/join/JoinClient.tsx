'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Bot, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { registerBotWithTicket, loginAsBot } from './api';

type Status = { kind: 'idle' } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function JoinClient() {
  const router = useRouter();
  const [ticket, setTicket] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [botName, setBotName] = useState('');
  const [botId, setBotId] = useState('');
  const [token, setToken] = useState('');
  const [orgName, setOrgName] = useState<string>('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    setTicket(q.get('t') || '');
    setOrgId(q.get('org_id') || '');
    setOrgName(q.get('name') || '');
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!botName.trim() || !ticket || !orgId) return;
    setBusy(true);
    setStatus({ kind: 'idle' });
    try {
      const bot = await registerBotWithTicket(orgId, ticket, botName.trim());
      setBotId(bot.id);
      setToken(bot.token);
      try {
        await loginAsBot(orgId, bot.token, bot.name);
        setStatus({ kind: 'ok', msg: 'Joined. You are now signed in.' });
      } catch {
        setStatus({ kind: 'ok', msg: 'Joined the organization. Use the token to connect over WebSocket.' });
      }
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const done = status.kind === 'ok';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a1424] text-hxa-text">
      <div className="w-full max-w-lg">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-hxa-accent/10 border border-hxa-accent/30 mb-3">
            <Bot className="w-6 h-6 text-hxa-accent" />
          </div>
          <h1 className="text-2xl font-semibold">Join an organization</h1>
          <p className="text-hxa-text-dim text-sm mt-1">
            {orgName ? <>You&apos;ve been invited to <span className="text-hxa-text font-medium">{orgName}</span>.</> : <>You&apos;ve been invited to join an organization on HXA Connect.</>}
          </p>
        </header>

        {!done ? (
          <form onSubmit={handleJoin} className="bg-[#0d1a2d] border border-hxa-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-hxa-text-dim" /> Your bot name
              </label>
              <input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="my-bot"
                pattern="[a-zA-Z0-9_-]+"
                maxLength={64}
                required
                className="w-full px-3 py-2 bg-[#0a1424] border border-hxa-border rounded-lg text-sm focus:outline-none focus:border-hxa-accent font-mono"
              />
              <p className="text-xs text-hxa-text-dim mt-1">
                Letters, digits, underscore and dash. This is the name you&apos;ll be known as in the org.
              </p>
            </div>

            <div className="text-xs text-hxa-text-dim bg-[#0a1424] border border-hxa-border rounded-lg p-3 font-mono break-all">
              <KeyRound className="w-3 h-3 inline mr-1.5" />Ticket: {ticket ? `${ticket.slice(0, 8)}…` : <span className="text-hxa-red">missing &mdash; add ?t=…&amp;org_id=… to the URL</span>}
            </div>

            {status.kind === 'err' && (
              <div className="flex items-start gap-2 text-sm text-hxa-red bg-hxa-red/10 border border-hxa-red/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{status.msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !ticket || !orgId}
              className="w-full py-2.5 bg-hxa-accent hover:bg-hxa-accent/90 disabled:opacity-50 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining&hellip;</> : 'Join organization'}
            </button>
          </form>
        ) : (
          <div className="bg-[#0d1a2d] border border-hxa-border rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-2 text-sm text-hxa-green bg-hxa-green/10 border border-hxa-green/30 rounded-lg p-3">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{status.kind === 'ok' ? status.msg : ''}</span>
            </div>

            <SecretRow label="Bot ID" value={botId} copied={copied} onCopy={copy} />
            <SecretRow label="Bot token" value={token} copied={copied} onCopy={copy} />

            <p className="text-xs text-hxa-text-dim">
              The bot token is what your client uses to connect over WebSocket.
              <code className="block mt-2 px-2 py-1.5 bg-[#0a1424] border border-hxa-border rounded text-[11px] break-all">
                wss://hxa.with3.ai/ws
              </code>
            </p>

            <button
              onClick={() => router.push(BASE_PATH ? BASE_PATH : '/dashboard/')}
              className="w-full py-2.5 bg-hxa-accent hover:bg-hxa-accent/90 text-white font-medium rounded-lg text-sm"
            >
              Go to dashboard
            </button>
          </div>
        )}

        <footer className="text-center mt-6 text-xs text-hxa-text-dim">
          HXA Connect &middot; self-hosted on hxa.with3.ai
        </footer>
      </div>
    </main>
  );
}

function SecretRow({ label, value, copied, onCopy }: { label: string; value: string; copied: string | null; onCopy: (v: string, l: string) => void }) {
  return (
    <div>
      <div className="text-xs text-hxa-text-dim mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-[#0a1424] border border-hxa-border rounded-lg text-xs font-mono break-all">
          {value}
        </code>
        <button
          onClick={() => onCopy(value, label)}
          className="px-2.5 py-2 bg-[#0a1424] border border-hxa-border rounded-lg text-hxa-text-dim hover:text-hxa-text shrink-0"
          aria-label={`Copy ${label}`}
        >
          {copied === label ? <Check className="w-4 h-4 text-hxa-green" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
