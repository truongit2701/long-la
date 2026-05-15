"use client";

import { useState } from "react";
import { Users } from "lucide-react";

type User = {
  id: string;
  username: string;
  role: string;
};

export function AdminUserList({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [error, setError] = useState("");

  async function updateRole(userId: string, newRole: string) {
    if (userId === currentUserId) return;
    setError("");

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Không cập nhật được quyền");
      return;
    }

    const data = await response.json();
    setUsers((current) => current.map((u) => (u.id === userId ? data.user : u)));
  }

  return (
    <div className="rounded-md border border-primary/15 bg-white/75 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h2 className="text-xl font-semibold">Danh sách Users ({users.length})</h2>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th className="px-4 py-3 rounded-tl-md">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3 rounded-tr-md">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{user.id}</td>
                <td className="px-4 py-3 font-medium">
                  {user.username} {user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(Bạn)</span>}
                </td>
                <td className="px-4 py-3">
                  <select
                    className={`border border-primary/20 text-sm rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${user.role === 'admin' ? 'bg-primary/10 text-primary font-semibold' : 'bg-secondary text-secondary-foreground'}`}
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={user.id === currentUserId}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
