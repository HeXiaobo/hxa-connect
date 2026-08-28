'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Building2, Bot, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { createOrgWithInvite, registerBot, loginAsBot } from './api';

type Status = { kind: 'idle' } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function InvitePage() {
  const router = useRouter();
  const [code, setCode] = useState<string>('');
  const [orgName, setOrgName] = useState('');
  const [botName, setBotName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [orgSecret, setOrgSecret] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botId, setBotId] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCode(new URLSearchParams(window.location.search).get('code') || '');
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || !botName.trim() || !code) return;
    setBusy(true);
    setStatus({ kind: 'idle' });
    try {
      const org = await createOrgWithInvite(code, orgName.trim());
      setOrgId(org.org_id);
      setOrgSecret(org.org_secret);
      const bot = await registerBot(org.org_id, org.org_secret, botName.trim());
      setBotId(bot.id);
      setBotToken(bot.token);
      try {
        await loginAsBot(org.org_id, bot.token, bot.name);
        setStatus({ kind: 'ok', msg: 'Org created, bot registered, session active.' });
      } catch {
        setStatus({ kind: 'ok', msg: 'Org created and bot registered. You can now use the token to connect.' });
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
            <KeyRound className="w-6 h-6 text-hxa-accent" />
          </div>
          <h1 className="text-2xl font-semibold">Join HXA Connect</h1>
          <p className="text-hxa-text-dim text-sm mt-1">
            You&apos;ve been invited. Create your organization to get started.
          </p>
        </header>

        {!done ? (
          <form onSubmit={handleCreate} className="bg-[#0d1a2d] border border-hxa-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-hxa-text-dim" /> Organization name
              </label>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                maxLength={128}
                required
                className="w-full px-3 py-2 bg-[#0a1424] border border-hxa-border rounded-lg text-sm focus:outline-none focus:border-hxa-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-hxa-text-dim" /> First bot name
              </label>
              <input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="my-first-bot"
                pattern="[a-zA-Z0-9_-]+"
                maxLength={64}
                required
                className="w-full px-3 py-2 bg-[#0a1424] border border-hxa-border rounded-lg text-sm focus:outline-none focus:border-hxa-accent font-mono"
              />
            </div>

            <div className="text-xs text-hxa-text-dim bg-[#0a1424] border border-hxa-border rounded-lg p-3 font-mono break-all">
              Invite code: {code || <span className="text-hxa-red">missing &mdash; add ?code=... to the URL</span>}
            </div>

            {status.kind === 'err' && (
              <div className="flex items-start gap-2 text-sm text-hxa-red bg-hxa-red/10 border border-hxa-red/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{status.msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !code}
              className="w-full py-2.5 bg-hxa-accent hover:bg-hxa-accent/90 disabled:opacity-50 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating&hellip;</> : 'Create organization'}
            </button>
          </form>
        ) : (
          <div className="bg-[#0d1a2d] border border-hxa-border rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-2 text-sm text-hxa-green bg-hxa-green/10 border border-hxa-green/30 rounded-lg p-3">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{status.kind === 'ok' ? status.msg : ''}</span>
            </div>

            <SecretRow label="Organization ID" value={orgId} copied={copied} onCopy={copy} />
            <SecretRow label="Org secret (admin)" value={orgSecret} copied={copied} onCopy={copy} />
            <SecretRow label="Bot ID" value={botId} copied={copied} onCopy={copy} />
            <SecretRow label="Bot token" value={botToken} copied={copied} onCopy={copy} />

            <p className="text-xs text-hxa-text-dim">
              The org secret is the master key for this organization &mdash; store it safely.
              The bot token is what your client uses to connect over WebSocket.
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
