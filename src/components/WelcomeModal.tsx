import { useState } from 'react';
import { useI18n, LANGS, type Lang } from '../i18n';

interface WelcomeModalProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  onFinish: (useLiveData: boolean) => void;
}

export default function WelcomeModal({ lang, setLang, onFinish }: WelcomeModalProps) {
  const { t } = useI18n();
  const [useLive, setUseLive] = useState(true);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="modal-card welcome-card">
        <h2 id="welcome-title">{t('welcome.title')}</h2>
        <p className="welcome-intro">{t('welcome.intro')}</p>

        <div className="welcome-section">
          <h3>{t('welcome.langQ')}</h3>
          <div className="welcome-langs" role="group" aria-label={t('lang.label')}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                className={`welcome-lang ${lang === l.code ? 'active' : ''}`}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="welcome-section">
          <h3>{t('welcome.dataQ')}</h3>
          <p className="welcome-sub">{t('welcome.dataDesc')}</p>
          <div className="welcome-choice" role="group" aria-label={t('welcome.dataQ')}>
            <button
              className={`welcome-opt ${useLive ? 'active' : ''}`}
              onClick={() => setUseLive(true)}
              aria-pressed={useLive}
            >
              {t('welcome.dataYes')}
            </button>
            <button
              className={`welcome-opt ${!useLive ? 'active' : ''}`}
              onClick={() => setUseLive(false)}
              aria-pressed={!useLive}
            >
              {t('welcome.dataNo')}
            </button>
          </div>
        </div>

        <div className="welcome-section">
          <h3>{t('welcome.how.title')}</h3>
          <ul className="welcome-how">
            <li>{t('welcome.how.schedule')}</li>
            <li>{t('welcome.how.groups')}</li>
            <li>{t('welcome.how.bracket')}</li>
            <li>{t('welcome.how.save')}</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={() => onFinish(useLive)}>
            {t('welcome.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
