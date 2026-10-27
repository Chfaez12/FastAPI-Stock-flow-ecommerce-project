import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Alert, Spinner } from '../../components/ui/Feedback';
import { AuthService } from '../../services/endpoints';
import { getErrorMessage } from '../../lib/errors';

/** Small form that re-sends the signup confirmation email. */
export const ResendVerification: React.FC<{ initialEmail?: string }> = ({ initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      setMessage((await AuthService.resendVerification(email.trim())).data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="stack-sm" onSubmit={send} noValidate>
      {message && <Alert kind="info">{message}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="row" style={{ gap: 8 }}>
        <div className="input-group grow">
          <Mail />
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </div>
        <button className="btn btn-secondary" disabled={sending || !email.trim()}>
          {sending && <Spinner />}
          Resend link
        </button>
      </div>
    </form>
  );
};
