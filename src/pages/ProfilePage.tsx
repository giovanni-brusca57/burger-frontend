import { useState } from 'react';
import { Copy, Check, User, Mail, Globe, LogOut, Radio, Shield, Languages, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

// ---------------------------------------------------------------------------
// Telemetry row — Mono-label · Orbitron-value pairs inside the operator card
// ---------------------------------------------------------------------------

function TelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="op-tel-row">
      <span className="op-tel-label">{label}</span>
      <span className="op-tel-value" title={value}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tactical form field — mono label with > prompt + neon-focus input
// ---------------------------------------------------------------------------

function TacField({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="tac-field">
      <label className="tac-field-label">{label}</label>
      <div className="tac-field-shell">
        <Icon className="tac-field-icon size-4" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tac-field-input"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty placeholder for tabs not implemented yet — keeps the synthwave aesthetic
// ---------------------------------------------------------------------------

function EmptyComingSoon() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="size-14 rounded-md border border-primary/30 bg-primary/5 flex items-center justify-center"
           style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
        <Shield className="size-6 text-primary/80" />
      </div>
      <p className="font-cyber text-sm tracking-widest text-primary/90">{t('profile.comingSoon')}</p>
      <p className="text-xs text-muted-foreground/70 font-mono">{t('profile.comingSoonDescription')}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Language chip — clip-path tactical tile
// ---------------------------------------------------------------------------

function LangChip({
  flag,
  label,
  code,
  active,
  onClick,
}: {
  flag: string;
  label: string;
  code: SupportedLanguage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('lang-chip', active && 'is-active')}
    >
      <span className="lang-chip-flag">{flag}</span>
      <span className="lang-chip-code">{code.toUpperCase()}</span>
      <span className="lang-chip-label">{label}</span>
      {active && <Check className="lang-chip-check size-4" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();

  const [copied, setCopied] = useState(false);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage
  );

  const displayName = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...`
    : 'Guest';
  const initial = displayName.charAt(0).toUpperCase();

  const affiliateUrl = user?.walletAddress
    ? `${import.meta.env.VITE_BASE_URL || window.location.origin}?ref=${encodeURIComponent(user.walletAddress)}`
    : '';

  const handleCopyAffiliate = async () => {
    if (!affiliateUrl) return;
    try {
      await navigator.clipboard.writeText(affiliateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('profile.copyError'));
    }
  };

  const handleLangChange = (lang: SupportedLanguage) => {
    changeLanguage(lang);
    setCurrentLang(lang);
  };

  // Tab definitions — each one carries a neon-tab variant so the chip glows
  // in its own hue when active.
  const TABS: { key: string; labelKey: string; variant: string; icon: React.ElementType }[] = [
    { key: 'profile',    labelKey: 'profile.tabProfile',    variant: 'neon-tab--cyan',   icon: User       },
    { key: 'security',   labelKey: 'profile.tabSecurity',   variant: 'neon-tab--mint',   icon: Shield     },
    { key: 'withdrawal', labelKey: 'profile.tabWithdrawal', variant: 'neon-tab--gold',   icon: ArrowRightLeft },
    { key: 'language',   labelKey: 'profile.tabLanguage',   variant: 'neon-tab--violet', icon: Languages  },
  ];

  return (
    <div className="space-y-8">
      {/* Hero — Dashboard pattern */}
      <div className="card-operator relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-4 top-4 z-10 hidden sm:inline-flex">
          <StatusBadge variant="active" animated>
            {t('dashboard.active')}
          </StatusBadge>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 -z-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 90% 50%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <p className="eyebrow text-primary">// OPERATOR CARD</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mt-2 pr-24">
            {t('profile.title')}
          </h1>
          <p className="editorial-quote mt-2">
            &ldquo;Your operator card &mdash; rank, claims, history.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {/* OPERATOR ID DOSSIER */}
          <div className="op-id-card">
            {/* Top classification bar */}
            <div className="op-id-bar">
              <span>OPERATOR · DOSSIER</span>
              <span className="op-id-clearance">CLR · A-7</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Hex avatar + name */}
              <div className="space-y-3 pt-1">
                <div className="hex-avatar">
                  <div className="hex-avatar-inner">{initial}</div>
                  <div className="hex-avatar-ticks" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="font-cyber text-base font-bold tracking-widest text-foreground">{displayName}</p>
                  <p className="op-id-uid">{user?.walletAddress ?? '—'}</p>
                </div>
              </div>

              {/* Telemetry rows */}
              <div className="op-tel">
                <TelRow label={t('profile.uid')}            value={user?.userId ?? '—'} />
                <TelRow label={t('profile.depositBalance')} value="0.0000 USDT" />
                <TelRow label={t('profile.unaiBalance')}    value="0.0000 USDT" />
                <TelRow label={t('profile.memberSince')}    value="—" />
                <TelRow label={t('profile.country')}        value="—" />
              </div>

              {/* Decorative barcode */}
              <div className="op-barcode" aria-hidden="true" />

              {/* Terminate session */}
              <button
                onClick={logout}
                className="neon-btn neon-btn--rose w-full justify-center"
              >
                <LogOut className="size-3" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </div>

          {/* BROADCAST CHANNEL — affiliate link */}
          <div className="op-id-card">
            <div className="op-id-bar">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="size-3" />
                BROADCAST · CHANNEL
              </span>
              <span className="op-id-clearance">REF</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-mono">
                {t('profile.affiliateDescription')}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 op-id-uid text-left tracking-tight">
                  {affiliateUrl || '—'}
                </div>
                <button
                  onClick={handleCopyAffiliate}
                  className={cn('neon-btn', copied ? 'neon-btn--mint' : 'neon-btn--cyan')}
                >
                  {copied ? (
                    <>
                      <Check className="size-3" />
                      <span>{t('profile.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>{t('profile.copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="op-id-card h-fit">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tactical tab strip */}
            <TabsList className="bg-transparent h-auto p-3 gap-1.5 flex w-full justify-start border-b border-primary/15 rounded-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className={cn(
                      'neon-tab !rounded-none !shadow-none',
                      tab.variant,
                      isActive && 'is-active',
                    )}
                  >
                    <Icon className="size-3" />
                    {t(tab.labelKey)}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Profile form */}
            <TabsContent value="profile" className="mt-0 p-5 sm:p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-cyber text-sm font-bold tracking-widest text-primary">
                    &gt; UPDATE · PROFILE
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground tracking-widest">[WRITE]</span>
                </div>
                <div className="space-y-4">
                  <TacField
                    label={t('profile.fullName')}
                    placeholder={t('profile.fullNamePlaceholder')}
                    value={fullName}
                    onChange={setFullName}
                    icon={User}
                  />
                  <TacField
                    label={t('profile.countryLabel')}
                    placeholder={t('profile.countryPlaceholder')}
                    value={country}
                    onChange={setCountry}
                    icon={Globe}
                  />
                  <TacField
                    label={t('profile.emailAddress')}
                    placeholder={t('profile.emailPlaceholder')}
                    value={email}
                    onChange={setEmail}
                    icon={Mail}
                  />
                </div>
                <button className="neon-btn neon-btn--cyan">
                  <Check className="size-3" />
                  <span>{t('profile.updateProfileBtn')}</span>
                </button>
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <EmptyComingSoon />
            </TabsContent>

            <TabsContent value="withdrawal" className="mt-0">
              <EmptyComingSoon />
            </TabsContent>

            <TabsContent value="language" className="mt-0 p-5 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-cyber text-sm font-bold tracking-widest text-primary">
                    &gt; SELECT · LOCALE
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                    [{SUPPORTED_LANGUAGES.length} CHANNELS]
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <LangChip
                      key={lang.code}
                      flag={lang.flag}
                      label={lang.label}
                      code={lang.code}
                      active={currentLang === lang.code}
                      onClick={() => handleLangChange(lang.code)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
