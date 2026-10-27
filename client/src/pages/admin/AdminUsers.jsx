import { useState } from 'react';
import { adminApi } from '../../api/services';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Pagination from '../../components/common/Pagination';
import { AdminHeader, SearchInput, TableState } from '../../components/admin/AdminToolbar';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  useDocumentTitle('Users');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim());
  const { data, loading, error, reload } = useAsync(
    () => adminApi.users({ q: debounced || undefined, role: role || undefined, page, limit: 15 }),
    [debounced, role, page]
  );

  return (
    <>
      <AdminHeader
        title="Users"
        subtitle="Registered accounts (read-only). Administrators are created with the backend `npm run create-admin` command."
      />
      <div className="surface">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom border-secondary-subtle">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or email" />
          <label htmlFor="u-role" className="visually-hidden">Role</label>
          <select id="u-role" className="form-select w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No users found.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">City</th><th scope="col">Joined</th></tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}</td>
                  <td className="small">{u.email}</td>
                  <td>{u.role === 'admin' ? <span className="badge text-bg-danger">Admin</span> : <span className="badge text-bg-dark border border-secondary">User</span>}</td>
                  <td className="small">{u.city || '—'}</td>
                  <td className="small">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </>
  );
}
