import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import useDocumentTitle from '../hooks/useDocumentTitle';
import FormField from '../components/forms/FormField';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  const validate = () => {
    const next = {};
    if (!EMAIL.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    setFormError('');
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${user.username}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="container auth-wrap py-5">
      <div className="surface auth-card">
        <h1 className="section-title mb-1">
          Welcome <span className="accent">back</span>
        </h1>
        <p className="text-muted mb-4">Log in to book tickets and manage your bookings.</p>
        {formError && <div className="alert alert-danger py-2" role="alert">{formError}</div>}
        <form onSubmit={submit} noValidate>
          <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
          <FormField label="Password" error={errors.password}>
            {({ id, describedBy, invalid }) => (
              <div className="position-relative">
                <input
                  id={id}
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control pe-5${invalid ? ' is-invalid' : ''}`}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={set('password')}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  required
                />
                <button type="button" className="btn btn-ghost btn-icon password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            )}
          </FormField>
          <button type="submit" className="btn btn-primary w-100 btn-lg mt-2" disabled={submitting}>
            {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Log in
          </button>
        </form>
        <p className="text-center text-muted mt-4 mb-0">
          New to IMovies?{' '}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
