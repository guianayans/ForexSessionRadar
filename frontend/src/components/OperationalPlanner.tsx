import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { t, type SupportedLocale } from '@/lib/i18n';
import type { Planner } from '@/types/dashboard';

interface OperationalPlannerProps {
  planner: Planner;
  locale: SupportedLocale;
  onSavePlanner: (payload: Partial<Planner>) => Promise<void>;
}

function localizeChecklistLabel(id: string, fallback: string, locale: SupportedLocale) {
  const map: Record<string, Record<SupportedLocale, string>> = {
    support: {
      'pt-BR': 'Revisar niveis de suporte e resistencia',
      'en-US': 'Review support and resistance levels',
      'es-ES': 'Revisar niveles de soporte y resistencia'
    },
    calendar: {
      'pt-BR': 'Conferir calendario economico',
      'en-US': 'Check the economic calendar',
      'es-ES': 'Revisar el calendario economico'
    },
    risk: {
      'pt-BR': 'Confirmar risco maximo por trade',
      'en-US': 'Confirm max risk per trade',
      'es-ES': 'Confirmar riesgo maximo por operacion'
    }
  };

  return map[id]?.[locale] || fallback;
}

function removeFavoriteAriaLabel(asset: string, locale: SupportedLocale) {
  if (locale === 'en-US') {
    return `Remove ${asset}`;
  }
  if (locale === 'es-ES') {
    return `Eliminar ${asset}`;
  }
  return `Remover ${asset}`;
}

export function OperationalPlanner({ planner, locale, onSavePlanner }: OperationalPlannerProps) {
  const [newFavorite, setNewFavorite] = useState('');

  const sortedChecklist = useMemo(
    () => planner.checklist.slice().sort((a, b) => Number(a.done) - Number(b.done)),
    [planner.checklist]
  );

  return (
    <Card className="h-full border-border/70">
      <CardHeader>
        <CardTitle>{t(locale, 'planner.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          {sortedChecklist.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-md border border-border/70 bg-background/30 px-3 py-2">
              <Checkbox
                checked={item.done}
                onChange={(event) => {
                  const updated = planner.checklist.map((checklistItem) =>
                    checklistItem.id === item.id ? { ...checklistItem, done: event.target.checked } : checklistItem
                  );
                  void onSavePlanner({ checklist: updated });
                }}
              />
              <span className={item.done ? 'text-mutedForeground line-through' : ''}>
                {localizeChecklistLabel(item.id, item.label, locale)}
              </span>
            </label>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'planner.favorites')}</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {planner.favorites.map((favorite) => (
              <span
                key={favorite}
                className="inline-flex items-center gap-1 rounded-full border border-cyan/50 bg-cyan/10 px-2 py-1 text-xs"
              >
                {favorite}
                <button
                  className="rounded bg-transparent p-0.5 hover:bg-cyan/20"
                  onClick={() =>
                    void onSavePlanner({ favorites: planner.favorites.filter((item) => item !== favorite) })
                  }
                  aria-label={removeFavoriteAriaLabel(favorite, locale)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newFavorite}
              onChange={(event) => setNewFavorite(event.target.value.toUpperCase())}
              placeholder={t(locale, 'planner.addAssetPlaceholder')}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const value = newFavorite.trim();
                if (!value || planner.favorites.includes(value)) {
                  return;
                }
                void onSavePlanner({ favorites: [...planner.favorites, value] });
                setNewFavorite('');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'planner.notes')}</p>
          <Textarea
            value={planner.notes}
            onChange={(event) => void onSavePlanner({ notes: event.target.value })}
            className="min-h-28"
            placeholder={t(locale, 'planner.notesPlaceholder')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={planner.lockoutEnabled}
            onChange={(event) => void onSavePlanner({ lockoutEnabled: event.target.checked })}
          />
          {t(locale, 'planner.lockout')}
        </label>
      </CardContent>
    </Card>
  );
}
