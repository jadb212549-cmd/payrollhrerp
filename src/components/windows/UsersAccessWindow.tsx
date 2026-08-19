/**
 * Users & Access Management Window - Phase 10 Production Hardening
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UserCog, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Lock, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Eye, 
  Edit, 
  UserCheck, 
  UserX,
  X,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import { userRepository } from '../../repositories/UserRepository';
import { companyRepository } from '../../repositories/CompanyRepository';
import { SecurityService, UserRole, ROLE_PERMISSIONS } from '../../services/SecurityService';
import { auditService } from '../../services/AuditService';
import { User, Company } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';

export const UsersAccessWindow: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Fields
  const [formUsername, setFormUsername] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Payroll Admin');
  const [formCompanyAccess, setFormCompanyAccess] = useState<string[]>(['*']);
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await userRepository.findAll();
      const allCompanies = await companyRepository.findAll();
      setUsers(allUsers);
      setCompanies(allCompanies);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = selectedRoleFilter === 'All' || u.role === selectedRoleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, selectedRoleFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setFormUsername('');
    setFormDisplayName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('Payroll Admin');
    setFormCompanyAccess(['*']);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUsername.trim() || !formDisplayName.trim() || !formPassword.trim()) {
      setFormError('Username, Display Name, and Password are required.');
      return;
    }

    const existing = await userRepository.findByUsername(formUsername.trim());
    if (existing) {
      setFormError(`Username "${formUsername}" is already taken.`);
      return;
    }

    const hash = await SecurityService.hashPassword(formPassword);
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: formUsername.trim(),
      displayName: formDisplayName.trim(),
      email: formEmail.trim() || `${formUsername.trim()}@system.local`,
      passwordHash: hash,
      role: formRole,
      companyAccess: formCompanyAccess,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRepository.save(newUser);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      description: `Created user account for ${newUser.displayName} (${newUser.username}) with role ${newUser.role}`,
    });

    setShowCreateModal(false);
    loadData();
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormDisplayName(user.displayName);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormCompanyAccess(user.companyAccess || ['*']);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    selectedUser.displayName = formDisplayName.trim();
    selectedUser.email = formEmail.trim();
    selectedUser.role = formRole;
    selectedUser.companyAccess = formCompanyAccess;

    await userRepository.save(selectedUser);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      action: 'UPDATE',
      entityType: 'User',
      entityId: selectedUser.id,
      description: `Updated profile & role permissions for user ${selectedUser.username}`,
    });

    setShowEditModal(false);
    loadData();
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'Active' ? 'Deactivated' : 'Active';
    user.status = newStatus;
    await userRepository.save(user);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      description: `Changed user status for ${user.username} to ${newStatus}`,
    });

    loadData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword.trim()) return;

    selectedUser.passwordHash = await SecurityService.hashPassword(newPassword.trim());
    await userRepository.save(selectedUser);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      action: 'UPDATE',
      entityType: 'User',
      entityId: selectedUser.id,
      description: `Reset password for user account ${selectedUser.username}`,
    });

    setShowResetModal(false);
    setNewPassword('');
    loadData();
  };

  const isUserManagementAllowed = hasPermission('users:manage');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-3.5 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <UserCog className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">User Accounts & Access Control Matrix</h1>
              <p className="text-[11px] text-slate-500">Manage application users, multi-company access boundaries, and role permissions.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPermissionsMatrix(!showPermissionsMatrix)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Permissions Matrix
            </button>
            {isUserManagementAllowed && (
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add New User
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Role Filter:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Company Admin">Company Admin</option>
              <option value="Payroll Admin">Payroll Admin</option>
              <option value="HR">HR</option>
              <option value="Timekeeper">Timekeeper</option>
              <option value="Reviewer">Reviewer</option>
              <option value="Approver">Approver</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search user, name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Permissions Matrix Drawer / Overlay */}
      {showPermissionsMatrix && (
        <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 space-y-3 overflow-x-auto text-[11px] font-mono shadow-md">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs font-sans text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Role Permission Specification Matrix
            </span>
            <button onClick={() => setShowPermissionsMatrix(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ROLE_PERMISSIONS).map(([r, perms]) => (
              <div key={r} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <div className="font-bold text-white font-sans text-xs border-b border-slate-700 pb-1">{r}</div>
                <div className="text-[10px] text-slate-300 leading-relaxed font-sans">
                  {perms.map(p => p.split(':')[1]).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Accounts Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-3">Username</th>
              <th className="py-2.5 px-3">Display Name</th>
              <th className="py-2.5 px-3">Email Address</th>
              <th className="py-2.5 px-3">Assigned Role</th>
              <th className="py-2.5 px-3">Company Access Scope</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-slate-500 font-mono">Last Login</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{u.username}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{u.displayName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10.5px] font-bold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">
                    {u.companyAccess.includes('*') ? 'All Companies (*)' : `${u.companyAccess.length} Companies`}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {u.lastLoginAt ? u.lastLoginAt.replace('T', ' ').split('.')[0] : 'Never'}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    {isUserManagementAllowed && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowResetModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1 rounded ${
                              u.status === 'Active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Create System User Account
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-slate-600 font-medium block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  placeholder="e.g. jdoe_payroll"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                  placeholder="e.g. jane.doe@company.com"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Assigned Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Company Admin">Company Admin</option>
                  <option value="Payroll Admin">Payroll Admin</option>
                  <option value="HR">HR</option>
                  <option value="Timekeeper">Timekeeper</option>
                  <option value="Reviewer">Reviewer</option>
                  <option value="Approver">Approver</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Edit User — {selectedUser.username}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-4 space-y-3">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Company Admin">Company Admin</option>
                  <option value="Payroll Admin">Payroll Admin</option>
                  <option value="HR">HR</option>
                  <option value="Timekeeper">Timekeeper</option>
                  <option value="Reviewer">Reviewer</option>
                  <option value="Approver">Approver</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" /> Reset Password
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Enter a new password for account <strong>{selectedUser.username}</strong>:
              </p>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                placeholder="New Password"
              />
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
