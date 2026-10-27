import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import useDocumentTitle from '../hooks/useDocumentTitle';
import FormField, { fieldErrors } from '../components/forms/FormField';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(form) {
  const errors = {};
  const name = form.username.trim();
  if (name.length < 2 || name.length > 40) errors.username = 'Name must be 2 to 40 characters';
  if (!EMAIL.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.password.length < 8 || form.password.length > 72) errors.password = 'Password must be 8 to 72 characters';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Password must include a letter and a number';
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match';
  return errors;
}

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = validateRegistration(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setFormError('');
    try {
      const user = await register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      toast.success(`Welcome to IMovies, ${user.username}!`);
      navigate(from ? `${from.pathname}${from.search || ''}` : '/', { replace: true });
    } catch (err) {
      const server = fieldErrors(err);
      if (Object.keys(server).length) setErrors(server);
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
          Create your <span className="accent">account</span>
        </h1>
        <p className="text-muted mb-4">Book seats in seconds and keep all your tickets in one place.</p>
        {formError && <div className="alert alert-danger py-2" role="alert">{formError}</div>}
        <form onSubmit={submit} noValidate>
          <FormField label="Full name" autoComplete="name" value={form.username} onChange={set('username')} error={errors.username} required />
          <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="At least 8 characters, including a letter and a number."
            required
          />
          <FormField label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
          <button type="submit" className="btn btn-primary w-100 btn-lg mt-2" disabled={submitting}>
            {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Create account
          </button>
        </form>
        <p className="text-center text-muted mt-4 mb-0">
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
