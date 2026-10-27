import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi, movieApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import FormField, { fieldErrors } from '../components/forms/FormField';
import { formatDate } from '../utils/format';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const genres = useAsync(() => movieApi.filters(), []);
  const [form, setForm] = useState({ username: user.username, phone: user.phone || '', city: user.city || '', favoriteGenres: user.favoriteGenres || [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ username: user.username, phone: user.phone || '', city: user.city || '', favoriteGenres: user.favoriteGenres || [] });
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.username.trim().length < 2) next.username = 'Name must be at least 2 characters';
    if (form.phone && !/^[0-9+\-\s]{6,20}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ ...form, username: form.username.trim() });
      setUser(res.user);
      toast.success('Profile updated');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (g) =>
    setForm((f) => ({ ...f, favoriteGenres: f.favoriteGenres.includes(g) ? f.favoriteGenres.filter((x) => x !== g) : [...f.favoriteGenres, g] }));

  return (
    <form onSubmit={submit} className="surface p-4" noValidate>
      <h2 className="h5 fw-semibold mb-3">Personal details</h2>
      <FormField label="Full name" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} error={errors.username} />
      <FormField label="Email" value={user.email} disabled hint="Email cannot be changed." />
      <div className="row">
        <FormField className="col-md-6" label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
        <FormField className="col-md-6" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={errors.city} />
      </div>
      <fieldset className="mb-3">
        <legend className="form-label">Favourite genres</legend>
        <div className="d-flex flex-wrap gap-2">
          {genres.data?.genres.map((g) => (
            <button key={g} type="button" className="chip chip-toggle" aria-pressed={form.favoriteGenres.includes(g)} onClick={() => toggleGenre(g)}>
              {g}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
        Save changes
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword))
      next.newPassword = 'At least 8 characters with a letter and a number';
    if (form.confirm !== form.newPassword) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      const server = fieldErrors(err);
      setErrors(Object.keys(server).length ? server : { currentPassword: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface p-4" noValidate>
      <h2 className="h5 fw-semibold mb-3">Change password</h2>
      <FormField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} error={errors.currentPassword} />
      <FormField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} error={errors.newPassword} />
      <FormField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
      <button type="submit" className="btn btn-outline-light" disabled={saving}>
        {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
        Update password
      </button>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <span className="avatar" style={{ width: 64, height: 64, fontSize: '1.6rem' }} aria-hidden="true">
          {user.username[0].toUpperCase()}
        </span>
        <div>
          <h1 className="h3 fw-bold m-0">{user.username}</h1>
          <p className="text-muted m-0 small">
            {user.email} · {user.role === 'admin' ? 'Administrator' : 'Member'} since {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-lg-7"><ProfileForm /></div>
        <div className="col-lg-5"><PasswordForm /></div>
      </div>
    </div>
  );
}
