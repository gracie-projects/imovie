import { Link } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound({ message = "The page you're looking for has left the theatre." }) {
  useDocumentTitle('Not found');
  return (
    <div className="container py-5 text-center">
      <div className="not-found-code" aria-hidden="true">404</div>
      <h1 className="h3 fw-bold">Scene missing</h1>
      <p className="text-muted mb-4">{message}</p>
      <div className="d-flex gap-2 justify-content-center">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/movies" className="btn btn-outline-light">Browse movies</Link>
      </div>
    </div>
  );
}
