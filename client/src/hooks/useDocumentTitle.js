import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | IMovies` : 'IMovies – Movie Ticket Booking';
  }, [title]);
}
