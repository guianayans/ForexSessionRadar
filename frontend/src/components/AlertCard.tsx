import { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Bell } from 'lucide-react';
import { formatCountdown } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useLiveNow } from '@/hooks/useLiveNow';
import { formatIsoInTimezone, localizeEventTitle, t, type SupportedLocale } from '@/lib/i18n';
import { updateEmailConfig } from '@/services/api';
import type { MarketState, NextAlert, Preferences } from '@/types/dashboard';

interface EmailStatus {
  enabled: boolean;
  configured: boolean;
  reason?: string | null;
  from?: string | null;
  defaultRecipient?: string | null;
}

interface AlertCardProps {
  nextAlert: NextAlert | null;
  emailStatus: EmailStatus | null;
  preferences: Preferences;
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  marketOpen: boolean;
  marketState: MarketState;
  onOpenEmailConfig: () => void;
  onUpdatePreferences: (payload: Partial<Preferences>) => Promise<void>;
}

const leadOptions: Array<5 | 10 | 15 | 30> = [5, 10, 15, 30];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailSettingsSectionProps {
  locale: SupportedLocale;
  emailStatus: EmailStatus | null;
  emailDraft: string;
  emailEnabledDraft: boolean;
  hasEmailChanges: boolean;
  emailIsValid: boolean;
  emailSaving: boolean;
  emailFeedback: string | null;
  emailError: string | null;
  onOpenEmailConfig: () => void;
  onEmailChange: (value: string) => void;
  onSaveEmail: () => void;
  onToggleEmail: (checked: boolean) => void;
}

function EmailSettingsSection({
  locale,
  emailStatus,
  emailDraft,
  emailEnabledDraft,
  hasEmailChanges,
  emailIsValid,
  emailSaving,
  emailFeedback,
  emailError,
  onOpenEmailConfig,
  onEmailChange,
  onSaveEmail,
  onToggleEmail
}: EmailSettingsSectionProps) {
  const smtpEnabled = Boolean(emailStatus?.enabled);
  const smtpConfigured = Boolean(emailStatus?.configured);
  const recipient = (emailDraft || emailStatus?.defaultRecipient || '').trim();

  const emailHint = useMemo(() => {
    if (smtpEnabled && smtpConfigured && recipient) {
      return t(locale, 'alert.emailSendingTo', { email: recipient });
    }
    if (!smtpEnabled) {
      return t(locale, 'alert.emailSmtpDisabled');
    }
    if (!smtpConfigured) {
      return emailStatus?.reason || t(locale, 'alert.emailSmtpMissing');
    }
    return t(locale, 'alert.emailHint');
  }, [emailStatus?.reason, locale, recipient, smtpConfigured, smtpEnabled]);

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'alert.emailTitle')}</p>
        <Button size="sm" variant="outline" onClick={onOpenEmailConfig}>
          {locale === 'en-US' ? 'SMTP' : locale === 'es-ES' ? 'SMTP' : 'SMTP'}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={emailEnabledDraft} onChange={(event) => onToggleEmail(event.target.checked)} />
        {t(locale, 'alert.emailEnable')}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={emailDraft}
          placeholder="trader@email.com"
          onChange={(event) => onEmailChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && hasEmailChanges) {
              event.preventDefault();
              onSaveEmail();
            }
          }}
          aria-label={t(locale, 'alert.emailAddress')}
          className="h-9"
        />
        <Button size="sm" variant="outline" disabled={!hasEmailChanges || !emailIsValid || emailSaving} onClick={onSaveEmail}>
          {t(locale, 'alert.emailSave')}
        </Button>
      </div>
      {!emailIsValid ? <p className="text-xs text-danger">{t(locale, 'alert.emailInvalid')}</p> : null}
      {emailError ? <p className="text-xs text-danger">{emailError}</p> : null}
      {emailFeedback ? <p className="text-xs text-cyan">{emailFeedback}</p> : null}
      <p className="text-xs text-mutedForeground">{emailHint}</p>
    </div>
  );
}

export function AlertCard({
  nextAlert,
  emailStatus,
  preferences,
  seedNowIso,
  baseTimezone,
  locale,
  marketOpen,
  marketState,
  onOpenEmailConfig,
  onUpdatePreferences
}: AlertCardProps) {
  const normalizedEmail = (preferences.emailAddress || '').trim();
  const normalizedEmailEnabled = Boolean(preferences.emailNotificationsEnabled);
  const [emailDraft, setEmailDraft] = useState(normalizedEmail);
  const [emailEnabledDraft, setEmailEnabledDraft] = useState(normalizedEmailEnabled);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    setEmailDraft(normalizedEmail);
  }, [normalizedEmail]);

  useEffect(() => {
    setEmailEnabledDraft(normalizedEmailEnabled);
  }, [normalizedEmailEnabled]);

  const nowIso = useLiveNow(seedNowIso, 1000);
  const liveCountdownSeconds = nextAlert
    ? Math.max(
        0,
        Math.floor(
          (DateTime.fromISO(nextAlert.triggerTimeIso, { setZone: true }).toMillis() - DateTime.fromISO(nowIso, { setZone: true }).toMillis()) / 1000
        )
      )
    : 0;
  const reopenCountdown = marketState.nextGlobalOpenIso
    ? Math.max(
        0,
        Math.floor((DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).toMillis() - DateTime.fromISO(nowIso, { setZone: true }).toMillis()) / 1000)
      )
    : 0;
  const hasEmailChanges = emailDraft.trim() !== normalizedEmail;
  const emailIsValid = emailDraft.trim() === '' || EMAIL_REGEX.test(emailDraft.trim());

  const handleEmailChange = (value: string) => {
    setEmailDraft(value);
    setEmailFeedback(null);
    setEmailError(null);
  };

  const handleSaveEmail = async () => {
    const nextEmail = emailDraft.trim();
    setEmailFeedback(null);
    setEmailError(null);

    if (!emailIsValid) {
      setEmailError(t(locale, 'alert.emailInvalid'));
      return;
    }

    setEmailSaving(true);
    try {
      await onUpdatePreferences({ emailAddress: nextEmail, emailNotificationsEnabled: true });
      setEmailEnabledDraft(true);
      await updateEmailConfig({
        enabled: true,
        defaultTo: nextEmail
      });
      setEmailFeedback(t(locale, 'alert.emailSaved'));
    } catch {
      setEmailError(t(locale, 'alert.emailSaveError'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailEnabledDraft(checked);
    setEmailFeedback(null);
    setEmailError(null);
    try {
      await onUpdatePreferences({ emailNotificationsEnabled: checked });
      await updateEmailConfig({
        enabled: checked,
        ...(emailDraft.trim() ? { defaultTo: emailDraft.trim() } : {})
      });
    } catch {
      setEmailEnabledDraft(!checked);
      setEmailError(t(locale, 'alert.emailSaveError'));
    }
  };

  if (!marketOpen) {
    return (
      <Card className="h-full border-border/70">
        <CardHeader>
          <CardTitle>{t(locale, 'alert.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm text-mutedForeground">
              <Bell className="h-4 w-4 text-cyan" />
              {t(locale, 'alert.event')}
            </div>
            <p className="text-sm text-mutedForeground">{t(locale, 'alert.closedMessage')}</p>
          </div>

          <div className="rounded-lg border border-warning/45 bg-warning/10 p-3 text-sm text-slate-100">
            {t(locale, 'alert.reopenIn', { countdown: formatCountdown(reopenCountdown) })}
          </div>

          <EmailSettingsSection
            locale={locale}
            emailStatus={emailStatus}
            emailDraft={emailDraft}
            emailEnabledDraft={emailEnabledDraft}
            hasEmailChanges={hasEmailChanges}
            emailIsValid={emailIsValid}
            emailSaving={emailSaving}
            emailFeedback={emailFeedback}
            emailError={emailError}
            onOpenEmailConfig={onOpenEmailConfig}
            onEmailChange={handleEmailChange}
            onSaveEmail={() => void handleSaveEmail()}
            onToggleEmail={(checked) => void handleEmailToggle(checked)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/70">
      <CardHeader>
        <CardTitle>{t(locale, 'alert.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm text-mutedForeground">
            <Bell className="h-4 w-4 text-cyan" />
            {t(locale, 'alert.event')}
          </div>
          {nextAlert ? (
            <>
              <p className="text-base font-semibold">{localizeEventTitle(nextAlert.title, locale)}</p>
              <p className="text-sm text-mutedForeground">
                {t(locale, 'alert.triggersIn', {
                  countdown: formatCountdown(liveCountdownSeconds),
                  time: formatIsoInTimezone(nextAlert.eventTimeIso, baseTimezone, locale, 'HH:mm')
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-mutedForeground">{t(locale, 'alert.noPending')}</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'alert.leadMinutes')}</p>
          <div className="flex flex-wrap gap-2">
            {leadOptions.map((minutes) => (
              <Button
                key={minutes}
                variant={preferences.alertLeadMinutes === minutes ? 'default' : 'outline'}
                size="sm"
                onClick={() => void onUpdatePreferences({ alertLeadMinutes: minutes })}
              >
                {minutes}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={preferences.alertOnSessionOpen} onChange={(event) => void onUpdatePreferences({ alertOnSessionOpen: event.target.checked })} />
            {t(locale, 'alert.openSession')}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={preferences.alertOnOverlapStart} onChange={(event) => void onUpdatePreferences({ alertOnOverlapStart: event.target.checked })} />
            {t(locale, 'alert.overlapStart')}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={preferences.alertOnIdealWindowEnd} onChange={(event) => void onUpdatePreferences({ alertOnIdealWindowEnd: event.target.checked })} />
            {t(locale, 'alert.idealWindowEnd')}
          </label>
        </div>

        <EmailSettingsSection
          locale={locale}
          emailStatus={emailStatus}
          emailDraft={emailDraft}
          emailEnabledDraft={emailEnabledDraft}
          hasEmailChanges={hasEmailChanges}
          emailIsValid={emailIsValid}
          emailSaving={emailSaving}
          emailFeedback={emailFeedback}
          emailError={emailError}
          onOpenEmailConfig={onOpenEmailConfig}
          onEmailChange={handleEmailChange}
          onSaveEmail={() => void handleSaveEmail()}
          onToggleEmail={(checked) => void handleEmailToggle(checked)}
        />
      </CardContent>
    </Card>
  );
}
