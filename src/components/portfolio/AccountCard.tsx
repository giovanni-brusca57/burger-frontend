import { useTranslation } from 'react-i18next';
import { Mail, KeyRound, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuthModalStore } from '@/stores/auth-modal.store';
import type { AuthUser } from '@/stores/auth.store';

interface Props {
  user: AuthUser | null;
}

/**
 * Account · Credentials Module
 * ────────────────────────────────────────────────────────────────────────
 * Tactical reskin of the simple Email + Change-Password card.
 *
 *   ▎ Tactical command bar  (Orbitron title + pulsing ●SYNCED LED)
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ ⬡ ✉  EMAIL · IDENTITY                       [● VERIFIED]  │
 *   │     op@burger.local                                       │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ ⬡ 🔑 PASSPHRASE                                      ›    │
 *   │     ●●●●●●●●●●●●●●                                       │
 *   │     CHANGE · FORGOT PASSWORD                              │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Each "cred-slot" carries its own neon hue (--cred-c) — cyan for the
 * identity field, violet for the passphrase. Hex badge + scanline +
 * left rail glow keep the synthwave dossier language consistent with
 * the ProfilePage / WalletHistory work.
 */
export function AccountCard({ user }: Props) {
  const { t } = useTranslation();
  const showForgotPassword = useAuthModalStore((s) => s.showForgotPassword);

  return (
    <div className="op-id-card">
      {/* ── Tactical command bar ── */}
      <div className="tx-cmdbar">
        <span className="tx-cmdbar-title">
          <ShieldCheck className="size-3.5" />
          {t('portfolio.accountSection')} · Credentials
        </span>
        <span className="tx-cmdbar-live">SYNCED</span>
      </div>

      <div className="p-4 space-y-3">
        {/* ── EMAIL slot — cyan ── */}
        <div className="cred-slot cred-slot--cyan">
          <div className="cred-badge">
            <Mail className="size-4" />
          </div>
          <div className="cred-content">
            <span className="cred-label">{t('portfolio.email')} · Identity</span>
            <span className="cred-value">{user?.email ?? '—'}</span>
          </div>
          <span className="cred-status">VERIFIED</span>
        </div>

        {/* ── PASSPHRASE slot — violet, clickable ── */}
        <button
          onClick={() => showForgotPassword(user?.email)}
          className="cred-slot cred-slot--violet"
        >
          <div className="cred-badge">
            <KeyRound className="size-4" />
          </div>
          <div className="cred-content">
            <span className="cred-label">Passphrase</span>
            <span className="cred-value cred-value--masked">{'•'.repeat(12)}</span>
            <span className="cred-sub">{t('portfolio.changePassword')}</span>
          </div>
          <ChevronRight className="cred-chevron size-4" />
        </button>
      </div>
    </div>
  );
}
