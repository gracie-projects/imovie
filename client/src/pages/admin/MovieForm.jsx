import { useState } from 'react';
import FormField, { fieldErrors } from '../../components/forms/FormField';
import { getErrorMessage } from '../../api/client';
import { movieApi } from '../../api/services';
import { toDateInput } from '../../utils/format';

const CERTS = ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'];
const URL_OK = (v) => !v || v.startsWith('/') || /^https?:\/\//i.test(v);

const initial = (movie) => ({
  movieName: movie?.movieName || '',
  description: movie?.description || '',
  genres: movie?.genres || [],
  language: movie?.language || '',
  durationMins: movie?.durationMins || '',
  releaseDate: toDateInput(movie?.releaseDate),
  certification: movie?.certification || 'U/A 13+',
  status: movie?.status || 'now-showing',
  featured: Boolean(movie?.featured),
  director: movie?.director || '',
  cast: movie?.cast?.join(', ') || '',
  posterUrl: movie?.posterUrl || '',
  backdropUrl: movie?.backdropUrl || '',
  trailerUrl: movie?.trailerUrl || '',
});

export default function MovieForm({ movie, genres, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initial(movie));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.movieName.trim()) e.movieName = 'Title is required';
    if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!form.genres.length) e.genres = 'Choose at least one genre';
    if (!form.language.trim()) e.language = 'Language is required';
    const d = Number(form.durationMins);
    if (!Number.isInteger(d) || d < 30 || d > 300) e.durationMins = 'Duration must be 30–300 minutes';
    if (!form.releaseDate) e.releaseDate = 'Release date is required';
    ['posterUrl', 'backdropUrl', 'trailerUrl'].forEach((k) => {
      if (!URL_OK(form[k].trim())) e[k] = 'Use an http(s) URL or a path starting with /';
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    const body = {
      ...form,
      movieName: form.movieName.trim(),
      description: form.description.trim(),
      language: form.language.trim(),
      durationMins: Number(form.durationMins),
      cast: form.cast.split(',').map((c) => c.trim()).filter(Boolean),
      posterUrl: form.posterUrl.trim(),
      backdropUrl: form.backdropUrl.trim(),
      trailerUrl: form.trailerUrl.trim(),
    };
    try {
      const res = movie ? await movieApi.update(movie._id, body) : await movieApi.create(body);
      onSaved(res.movie);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (g) =>
    setForm((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g] }));

  return (
    <form onSubmit={submit} noValidate>
      {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}
      <FormField label="Title" value={form.movieName} onChange={set('movieName')} error={errors.movieName} maxLength={120} />
      <FormField label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} error={errors.description} maxLength={2000} />
      <fieldset className="mb-3">
        <legend className="form-label">Genres</legend>
        <div className="d-flex flex-wrap gap-2">
          {genres.map((g) => (
            <button key={g} type="button" className="chip chip-toggle" aria-pressed={form.genres.includes(g)} onClick={() => toggleGenre(g)}>
              {g}
            </button>
          ))}
        </div>
        {errors.genres && <div className="invalid-feedback d-block">{errors.genres}</div>}
      </fieldset>
      <div className="row">
        <FormField className="col-md-4" label="Language" value={form.language} onChange={set('language')} error={errors.language} />
        <FormField className="col-md-4" label="Duration (minutes)" type="number" min={30} max={300} value={form.durationMins} onChange={set('durationMins')} error={errors.durationMins} />
        <FormField className="col-md-4" label="Release date" type="date" value={form.releaseDate} onChange={set('releaseDate')} error={errors.releaseDate} />
      </div>
      <div className="row">
        <FormField className="col-md-4" label="Certification">
          {({ id }) => (
            <select id={id} className="form-select" value={form.certification} onChange={set('certification')}>
              {CERTS.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </FormField>
        <FormField className="col-md-4" label="Status">
          {({ id }) => (
            <select id={id} className="form-select" value={form.status} onChange={set('status')}>
              <option value="now-showing">Now showing</option>
              <option value="coming-soon">Coming soon</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          )}
        </FormField>
        <div className="col-md-4 d-flex align-items-center">
          <div className="form-check form-switch mt-md-3">
            <input className="form-check-input" type="checkbox" role="switch" id="featured" checked={form.featured} onChange={set('featured')} />
            <label className="form-check-label" htmlFor="featured">Featured on home page</label>
          </div>
        </div>
      </div>
      <div className="row">
        <FormField className="col-md-6" label="Director" value={form.director} onChange={set('director')} />
        <FormField className="col-md-6" label="Cast" hint="Comma-separated" value={form.cast} onChange={set('cast')} />
      </div>
      <FormField label="Poster URL" value={form.posterUrl} onChange={set('posterUrl')} error={errors.posterUrl} hint="https://… or /posters/name.svg. A placeholder is shown if the image cannot load." />
      <div className="row">
        <FormField className="col-md-6" label="Backdrop URL" value={form.backdropUrl} onChange={set('backdropUrl')} error={errors.backdropUrl} />
        <FormField className="col-md-6" label="Trailer URL" value={form.trailerUrl} onChange={set('trailerUrl')} error={errors.trailerUrl} />
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {movie ? 'Save movie' : 'Create movie'}
        </button>
      </div>
    </form>
  );
}
