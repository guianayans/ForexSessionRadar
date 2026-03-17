import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { fetchEmailConfig, testEmailConfig, updateEmailConfig, type EmailConfigPayload } from '@/services/api';
import type { SupportedLocale } from '@/lib/i18n';

interface EmailConfigModalProps {
  open: boolean;
  locale: SupportedLocale;
  prefillEmail?: string;
  onClose: () => void;
  onSaved: () => void;
}

type ProviderId = 'gmail' | 'outlook' | 'office365' | 'generic';

interface ProviderPreset {
  id: ProviderId;
  label: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  securityLabel: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: true,
    securityLabel: 'TLS/STARTTLS'
  },
  {
    id: 'outlook',
    label: 'Outlook',
    smtpHost: 'smtp-mail.outlook.com',
    smtpPort: 587,
    smtpSecure: true,
    securityLabel: 'STARTTLS'
  },
  {
    id: 'office365',
    label: 'Office 365',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: true,
    securityLabel: 'TLS/STARTTLS'
  },
  {
    id: 'generic',
    label: 'Generico',
    smtpHost: 'smtp.seuprovedor.com',
    smtpPort: 587,
    smtpSecure: true,
    securityLabel: 'TLS (se disponivel)'
  }
];

const PROVIDER_BY_HOST: Record<string, ProviderId> = {
  'smtp.gmail.com': 'gmail',
  'smtp-mail.outlook.com': 'outlook',
  'smtp.office365.com': 'office365'
};

const DEFAULT_PROVIDER: ProviderId = 'gmail';
const DEFAULT_PROVIDER_PRESET = PROVIDERS.find((provider) => provider.id === DEFAULT_PROVIDER)!;

const EMPTY_CONFIG: EmailConfigPayload = {
  enabled: true,
  smtpHost: DEFAULT_PROVIDER_PRESET.smtpHost,
  smtpPort: DEFAULT_PROVIDER_PRESET.smtpPort,
  smtpSecure: DEFAULT_PROVIDER_PRESET.smtpSecure,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  whitelabelFrom: '',
  defaultTo: '',
  envPath: ''
};

function detectProvider(host?: string): ProviderId {
  const normalizedHost = (host || '').trim().toLowerCase();
  return PROVIDER_BY_HOST[normalizedHost] || 'generic';
}

function getProviderPreset(providerId: ProviderId) {
  return PROVIDERS.find((provider) => provider.id === providerId) || DEFAULT_PROVIDER_PRESET;
}

function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase();
}

function withSyncedEmail(payload: EmailConfigPayload, prefillEmail?: string) {
  const recipientEmail = normalizeEmail(prefillEmail) || normalizeEmail(payload.defaultTo);
  const senderEmail = normalizeEmail(payload.smtpUser) || recipientEmail;
  const next = {
    ...payload
  };

  if (senderEmail && !next.smtpUser.trim()) {
    next.smtpUser = senderEmail;
  }
  if (recipientEmail && !next.defaultTo.trim()) {
    next.defaultTo = recipientEmail;
  }
  if (senderEmail && !next.smtpFrom.trim()) {
    next.smtpFrom = `Forex Session Radar <${senderEmail}>`;
  }

  return next;
}

export function EmailConfigModal({ open, locale, prefillEmail, onClose, onSaved }: EmailConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [form, setForm] = useState<EmailConfigPayload>(EMPTY_CONFIG);

  useEffect(() => {
    if (!open) {
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    void fetchEmailConfig()
      .then((payload) => {
        if (!alive) {
          return;
        }

        const hasHost = Boolean(payload.smtpHost && payload.smtpHost.trim());
        const resolvedProvider = hasHost ? detectProvider(payload.smtpHost) : DEFAULT_PROVIDER;
        const preset = getProviderPreset(resolvedProvider);

        const nextForm = withSyncedEmail(
          {
            enabled: typeof payload.enabled === 'boolean' ? payload.enabled : true,
            smtpHost: hasHost ? payload.smtpHost || '' : preset.smtpHost,
            smtpPort: Number(payload.smtpPort || preset.smtpPort),
            smtpSecure: typeof payload.smtpSecure === 'boolean' ? payload.smtpSecure : preset.smtpSecure,
            smtpUser: payload.smtpUser || '',
            smtpPass: '',
            smtpFrom: payload.smtpFrom || '',
            whitelabelFrom: payload.whitelabelFrom || '',
            defaultTo: payload.defaultTo || '',
            envPath: payload.envPath || ''
          },
          prefillEmail
        );

        setHasStoredPassword(Boolean(payload.smtpPass && payload.smtpPass.trim()));
        setProvider(resolvedProvider);
        setForm(nextForm);
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar configuracao SMTP.');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [open, prefillEmail]);

  if (!open) {
    return null;
  }

  const setField = <K extends keyof EmailConfigPayload>(key: K, value: EmailConfigPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  };

  const applyProviderPreset = (nextProvider: ProviderId) => {
    const preset = getProviderPreset(nextProvider);
    setProvider(nextProvider);
    setForm((prev) => ({
      ...prev,
      smtpHost: preset.smtpHost,
      smtpPort: preset.smtpPort,
      smtpSecure: preset.smtpSecure
    }));
    setError(null);
    setSuccess(null);
  };

  const activeProviderPreset = getProviderPreset(provider);

  const buildPayload = () => {
    const normalizedUser = normalizeEmail(form.smtpUser);
    const normalizedDefaultTo = normalizeEmail(form.defaultTo) || normalizeEmail(prefillEmail);
    const base = withSyncedEmail(
      {
        ...form,
        smtpHost: form.smtpHost.trim(),
        smtpPort: Number(form.smtpPort) || 587,
        smtpUser: normalizedUser,
        smtpPass: form.smtpPass,
        smtpFrom: normalizedUser ? `Forex Session Radar <${normalizedUser}>` : '',
        whitelabelFrom: '',
        defaultTo: normalizedDefaultTo || ''
      },
      prefillEmail
    );

    // Preserve already stored backend password when user leaves APP_PASSWORD blank.
    if (!base.smtpPass.trim() && hasStoredPassword) {
      const { smtpPass, ...withoutPassword } = base;
      return withoutPassword;
    }

    return base;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload();
      const saved = await updateEmailConfig(payload);
      setProvider(detectProvider(saved.smtpHost));
      setForm((prev) => ({
        ...prev,
        ...withSyncedEmail(
          {
            ...saved,
            smtpPass: ''
          },
          prefillEmail
        ),
        envPath: saved.envPath || prev.envPath
      }));
      setHasStoredPassword(Boolean((form.smtpPass || '').trim()) || hasStoredPassword);
      setSuccess(locale === 'en-US' ? 'SMTP settings saved.' : locale === 'es-ES' ? 'Configuracion SMTP guardada.' : 'Configuracao SMTP salva.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configuracao SMTP.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await testEmailConfig(buildPayload());
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao testar conexao SMTP.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[780] flex items-center justify-center bg-black/55 p-4">
      <Card className="w-full max-w-2xl border-border/70 bg-[#040c1d] shadow-2xl">
        <CardHeader>
          <CardTitle>{locale === 'en-US' ? 'Email SMTP Settings' : locale === 'es-ES' ? 'Configuracion SMTP de correo' : 'Configuracao SMTP de e-mail'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-mutedForeground">Carregando...</p> : null}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.enabled} onChange={(event) => setField('enabled', event.target.checked)} />
            {locale === 'en-US' ? 'Enable email notifications in backend' : locale === 'es-ES' ? 'Habilitar envio de correo en backend' : 'Habilitar envio de e-mail no backend'}
          </label>

          <div className="rounded-md border border-border/60 bg-background/30 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-mutedForeground">
              {locale === 'en-US' ? 'Common provider presets' : locale === 'es-ES' ? 'Presets comunes de proveedor' : 'Presets comuns de provedor'}
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              {PROVIDERS.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={provider === item.id ? 'default' : 'outline'}
                  onClick={() => applyProviderPreset(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-mutedForeground">
              {locale === 'en-US' ? 'Encryption:' : locale === 'es-ES' ? 'Cifrado:' : 'Criptografia:'} {activeProviderPreset.securityLabel}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={form.smtpHost}
              onChange={(event) => setField('smtpHost', event.target.value)}
              placeholder="SMTP_HOST (ex: smtp.gmail.com)"
            />
            <Input
              type="number"
              value={String(form.smtpPort || 587)}
              onChange={(event) => setField('smtpPort', Number(event.target.value) || 587)}
              placeholder="SMTP_PORT (ex: 587)"
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.smtpSecure} onChange={(event) => setField('smtpSecure', event.target.checked)} />
              SMTP_SECURE
            </label>
            <div />
            <Input
              value={form.smtpUser}
              onChange={(event) => setField('smtpUser', event.target.value)}
              placeholder="SMTP_USER (e-mail remetente)"
            />
            <Input
              type="password"
              value={form.smtpPass}
              onChange={(event) => setField('smtpPass', event.target.value)}
              placeholder="APP_PASSWORD (senha de aplicativo)"
            />
          </div>

          {form.envPath ? (
            <p className="text-xs text-mutedForeground">
              {locale === 'en-US' ? 'Saved file:' : locale === 'es-ES' ? 'Archivo guardado:' : 'Arquivo salvo:'} {form.envPath}
            </p>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {success ? <p className="text-sm text-cyan">{success}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {locale === 'en-US' ? 'Close' : locale === 'es-ES' ? 'Cerrar' : 'Fechar'}
            </Button>
            <Button variant="outline" onClick={() => void handleTestConnection()} disabled={testing || saving || loading}>
              {testing ? (locale === 'en-US' ? 'Testing...' : locale === 'es-ES' ? 'Probando...' : 'Testando...') : locale === 'en-US' ? 'Test Connection' : locale === 'es-ES' ? 'Probar conexion' : 'Testar conexao'}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || testing || loading}>
              {saving ? (locale === 'en-US' ? 'Saving...' : locale === 'es-ES' ? 'Guardando...' : 'Salvando...') : locale === 'en-US' ? 'Save SMTP' : locale === 'es-ES' ? 'Guardar SMTP' : 'Salvar SMTP'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
