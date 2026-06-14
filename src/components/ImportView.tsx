import { useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface ImportViewProps {
  calendarName: string;
  customIcsName: string | null;
  matchCount: number;
  onImport: (text: string, name: string) => void;
  onResetCalendar: () => void;
  onResetScores: () => void;
}

export default function ImportView({
  calendarName,
  customIcsName,
  matchCount,
  onImport,
  onResetCalendar,
  onResetScores,
}: ImportViewProps) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!/\.ics$/i.test(file.name)) {
      setError(t('import.badFile'));
      return;
    }
    try {
      const text = await file.text();
      onImport(text, file.name);
    } catch {
      setError(t('import.readErr'));
    }
  };

  return (
    <div className="import-view">
      <div className="import-card">
        <h2>{t('import.title')}</h2>
        <p className="muted">{t('import.desc')}</p>

        <div
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInput.current?.click()}
        >
          <div className="dropzone-icon">📅</div>
          <p>
            <strong>{t('import.dropStrong')}</strong> {t('import.dropRest')}
          </p>
          <p className="muted">{t('import.browse')}</p>
          <input
            ref={fileInput}
            type="file"
            accept=".ics,text/calendar"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="import-status">
          <div>
            <span className="muted">{t('import.current')}</span>
            <strong>{calendarName}</strong>
            <span className="muted">{t('import.loaded', { n: matchCount })}</span>
          </div>
          {customIcsName && (
            <span className="custom-badge">{t('import.custom', { name: customIcsName })}</span>
          )}
        </div>

        <div className="import-actions">
          {customIcsName && (
            <button className="btn ghost" onClick={onResetCalendar}>
              {t('import.restore')}
            </button>
          )}
          <button className="btn danger" onClick={onResetScores}>
            {t('import.clearScores')}
          </button>
        </div>
      </div>
    </div>
  );
}
