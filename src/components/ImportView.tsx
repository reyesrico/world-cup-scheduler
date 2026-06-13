import { useRef, useState } from 'react';

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
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!/\.ics$/i.test(file.name)) {
      setError('Please choose a .ics calendar file.');
      return;
    }
    try {
      const text = await file.text();
      onImport(text, file.name);
    } catch {
      setError('Could not read that file.');
    }
  };

  return (
    <div className="import-view">
      <div className="import-card">
        <h2>Import a calendar</h2>
        <p className="muted">
          Load any FIFA-style <code>.ics</code> file to build the schedule. Use
          this to set up a future tournament — just export the matches as an ICS
          and drop it here. Your entered scores are kept separately and stay in
          this browser.
        </p>

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
            <strong>Drag &amp; drop</strong> an .ics file here
          </p>
          <p className="muted">or click to browse</p>
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
            <span className="muted">Current calendar</span>
            <strong>{calendarName}</strong>
            <span className="muted">{matchCount} matches loaded</span>
          </div>
          {customIcsName && (
            <span className="custom-badge">Custom: {customIcsName}</span>
          )}
        </div>

        <div className="import-actions">
          {customIcsName && (
            <button className="btn ghost" onClick={onResetCalendar}>
              Restore World Cup 2026 calendar
            </button>
          )}
          <button className="btn danger" onClick={onResetScores}>
            Clear all scores
          </button>
        </div>
      </div>
    </div>
  );
}
