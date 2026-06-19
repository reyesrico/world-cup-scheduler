import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';

// Web3Forms access key, injected at build time from a GitHub Actions variable.
// It is safe to expose (it only ever delivers to the owner's configured inbox);
// the owner's email address itself is never present in the client bundle.
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

interface FeedbackModalProps {
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    if (!WEB3FORMS_KEY) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: 'World Cup Scheduler — new feedback',
          from_name: 'World Cup Scheduler',
          message,
          contact: contact.trim() || 'n/a',
          page: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });
      const data: { success?: boolean } = await res.json();
      setStatus(data.success ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="modal-card feedback-card">
        <h2 id="feedback-title">{t('feedback.title')}</h2>

        {status === 'sent' ? (
          <>
            <p>{t('feedback.thanks')}</p>
            <div className="modal-actions">
              <button className="btn primary" onClick={onClose}>
                {t('feedback.close')}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="welcome-sub">{t('feedback.desc')}</p>

            <label className="feedback-label" htmlFor="fb-msg">
              {t('feedback.message')}
            </label>
            <textarea
              id="fb-msg"
              className="feedback-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.placeholder')}
              rows={5}
              required
            />

            <label className="feedback-label" htmlFor="fb-contact">
              {t('feedback.contact')}
            </label>
            <input
              id="fb-contact"
              className="feedback-input"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contactPlaceholder')}
            />

            {status === 'error' && <p className="feedback-error">{t('feedback.error')}</p>}

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                {t('feedback.cancel')}
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={status === 'sending' || !message.trim()}
              >
                {status === 'sending' ? t('feedback.sending') : t('feedback.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
