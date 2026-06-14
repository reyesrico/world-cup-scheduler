import { useI18n } from '../i18n';

interface RefreshModalProps {
  count: number;
  onUse: () => void;
  onKeep: () => void;
}

export default function RefreshModal({ count, onUse, onKeep }: RefreshModalProps) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="refresh-title">
      <div className="modal-card">
        <h2 id="refresh-title">{t('refresh.title')}</h2>
        <p>{t('refresh.body', { n: count })}</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onKeep}>
            {t('refresh.keep')}
          </button>
          <button className="btn primary" onClick={onUse}>
            {t('refresh.use')}
          </button>
        </div>
      </div>
    </div>
  );
}
