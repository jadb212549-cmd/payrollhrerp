import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Sliders, 
  CheckCircle, 
  Save, 
  AlertTriangle, 
  Archive, 
  RotateCcw, 
  Eye, 
  Calendar, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  History, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X,
  Sparkles,
  Lock
} from 'lucide-react';
import { Company, CompanyStatus, AuditLog } from '../../db/schema';
import { companyService, CreateCompanyInput, UpdateCompanyInput } from '../../services/CompanyService';
import { auditService } from '../../services/AuditService';
import { useCompanyContext } from '../../context/CompanyContext';

interface CompanyListWindowProps {
  onOpenAddCompany?: () => void;
  onOpenCompanyProfile?: (company: Company) => void;
  onOpenCompanySettings?: () => void;
}

export const CompanyListWindow: React.FC<CompanyListWindowProps> = ({
  onOpenAddCompany,
  onOpenCompanyProfile,
  onOpenCompanySettings,
}) => {
  const { setCompany, refreshCompanies, seedDemoCompanies } = useCompanyContext();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Archive modal state
  const [companyToArchive, setCompanyToArchive] = useState<Company | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Selected company for inline profile drawer or detail
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await companyService.listCompanies({
        searchTerm,
        status: statusFilter,
      });
      setCompanies(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load company records.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleArchiveConfirm = async () => {
    if (!companyToArchive) return;
    try {
      setIsArchiving(true);
      await companyService.archiveCompany(companyToArchive.id);
      await refreshCompanies();
      await loadCompanies();
      setCompanyToArchive(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to archive company.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (company: Company) => {
    try {
      setIsLoading(true);
      await companyService.restoreCompany(company.id);
      await refreshCompanies();
      await loadCompanies();
    } catch (err: any) {
      setError(err?.message || 'Failed to restore company.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (c: Company) => {
    if (onOpenCompanyProfile) {
      onOpenCompanyProfile(c);
    } else {
      setViewingCompany(c);
    }
  };

  if (viewingCompany) {
    return (
      <CompanyProfileWindow
        companyId={viewingCompany.id}
        onBack={() => {
          setViewingCompany(null);
          loadCompanies();
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-slate-700">
      {/* Action Toolbar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, legal name, trade name, TIN..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | 'All')}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700 outline-hidden focus:border-blue-500 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {companies.length === 0 && !searchTerm && (
            <button
              onClick={async () => {
                await seedDemoCompanies();
                await loadCompanies();
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Demo Companies</span>
            </button>
          )}

          {onOpenAddCompany && (
            <button
              onClick={onOpenAddCompany}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Company</span>
            </button>
          )}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="m-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Company Table / Grid */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading business entities...</div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Business Entities Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? `No companies matching "${searchTerm}". Try adjusting your search or status filter.`
                : 'No companies have been registered in the database yet.'}
            </p>
            {onOpenAddCompany && !searchTerm && (
              <button
                onClick={onOpenAddCompany}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Company</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3">Company Code</th>
                <th className="py-2.5 px-3">Registered Legal Name</th>
                <th className="py-2.5 px-3">Trade Name</th>
                <th className="py-2.5 px-3">TIN Number</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{company.companyCode}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-xs">{company.legalName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {company.tradeName || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {company.tin || <span className="text-slate-400 italic">Not set</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {company.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : company.status === 'Archived' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                        <Archive className="w-3 h-3" /> Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleView(company)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-xs transition-colors"
                        title="View complete entity profile"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>Profile</span>
                      </button>

                      {company.status === 'Archived' ? (
                        <button
                          onClick={() => handleRestore(company)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Restore company to Active status"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setCompanyToArchive(company)}
                          className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 text-slate-600 hover:text-amber-800 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Archive company"
                        >
                          <Archive className="w-3 h-3 text-slate-400" />
                          <span>Archive</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div>Showing {companies.length} business entities</div>
        <div className="font-mono text-[10px] text-slate-400">Offline Multi-Tenant Architecture</div>
      </div>

      {/* Safe Archive Confirmation Modal */}
      {companyToArchive && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Archive Business Entity?</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {companyToArchive.companyCode} • {companyToArchive.legalName}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1.5">
              <p className="font-semibold">Safe Archival Notice:</p>
              <p className="text-amber-800">
                Archiving will remove this company from the active top navigation selector and standard payroll processing lists.
              </p>
              <p className="text-slate-600 text-[11px]">
                Historical data is safely preserved. You can restore this entity at any time from the Company List.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCompanyToArchive(null)}
                disabled={isArchiving}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isArchiving ? 'Archiving...' : 'Archive Company'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AddCompanyWindow: React.FC<{ onSuccess?: (company: Company) => void }> = ({ onSuccess }) => {
  const { refreshCompanies, setCompany } = useCompanyContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCompanyInput>({
    companyCode: '',
    legalName: '',
    tradeName: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Philippines',
    contactNumber: '',
    email: '',
    website: '',
    tin: '',
    rdoCode: '',
    businessRegistrationNumber: '',
    sssEmployerNumber: '',
    philHealthEmployerNumber: '',
    pagIbigEmployerNumber: '',
  });

  const handleChange = (field: keyof CreateCompanyInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      const code = formData.companyCode.trim();
      if (!code || code.length < 2) {
        setError('Company Code is required and must have at least 2 characters.');
        return false;
      }
      if (!formData.legalName.trim()) {
        setError('Registered Legal Name is required.');
        return false;
      }
    }
    if (step === 2 && formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const created = await companyService.createCompany(formData);
      await refreshCompanies();
      setCompany(created);
      if (onSuccess) {
        onSuccess(created);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save company record.');
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Basic Information' },
    { num: 2, label: 'Address & Contact' },
    { num: 3, label: 'Registration & Tax' },
    { num: 4, label: 'Employer Statutory' },
    { num: 5, label: 'Review & Confirm' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Company Setup Wizard
              </h2>
              <p className="text-xs text-slate-500">
                Register a new corporate entity in the multi-company database.
              </p>
            </div>
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div key={step.num} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-500/20'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <span
                  className={`text-[11px] hidden md:inline font-medium ${
                    isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
                {idx < steps.length - 1 && <div className="h-px w-4 md:w-6 bg-slate-200 ml-1" />}
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Wizard Step Content */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 1 — Basic Company Identification
                </h3>
                <p className="text-[11px] text-slate-500">Provide the primary legal name and entity identifier.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Company Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyCode}
                    onChange={(e) => handleChange('companyCode', e.target.value.toUpperCase())}
                    placeholder="e.g. CSCM, JMDM, COMP001"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:border-blue-500 outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Must be unique. Automatically normalized uppercase for cross-company isolation.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Registered Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                    placeholder="e.g. CSCM Cheese Manufacturing Corp."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Trade / Brand Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.tradeName || ''}
                    onChange={(e) => handleChange('tradeName', e.target.value)}
                    placeholder="e.g. CSCM Cheese"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Address & Contact */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 2 — Corporate Address & Contact Details
                </h3>
                <p className="text-[11px] text-slate-500">Official office location and correspondence channels.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-semibold">Street Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="e.g. Lot 4 Block 2, Technopark Industrial Estate"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">City / Municipality</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Santa Rosa"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Province / State</label>
                  <input
                    type="text"
                    value={formData.province || ''}
                    onChange={(e) => handleChange('province', e.target.value)}
                    placeholder="e.g. Laguna"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    placeholder="e.g. 4026"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Country</label>
                  <input
                    type="text"
                    value={formData.country || 'Philippines'}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Contact Telephone</label>
                  <input
                    type="text"
                    value={formData.contactNumber || ''}
                    onChange={(e) => handleChange('contactNumber', e.target.value)}
                    placeholder="e.g. +63 49 541 2000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Official Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. payroll@company.ph"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-semibold">Website (Optional)</label>
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="e.g. https://www.company.ph"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Registration & Tax */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 3 — Government Tax & Registration
                </h3>
                <p className="text-[11px] text-slate-500">Tax Identification and Business Registration numbers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Tax Identification Number (TIN)
                  </label>
                  <input
                    type="text"
                    value={formData.tin || ''}
                    onChange={(e) => handleChange('tin', e.target.value)}
                    placeholder="000-000-000-000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">BIR RDO District Code</label>
                  <input
                    type="text"
                    value={formData.rdoCode || ''}
                    onChange={(e) => handleChange('rdoCode', e.target.value)}
                    placeholder="e.g. 057 - San Pedro / Santa Rosa"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Business Registration / SEC / DTI Number
                  </label>
                  <input
                    type="text"
                    value={formData.businessRegistrationNumber || ''}
                    onChange={(e) => handleChange('businessRegistrationNumber', e.target.value)}
                    placeholder="e.g. CS201812345"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Employer Statutory Numbers */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 4 — Statutory Employer Registrations
                </h3>
                <p className="text-[11px] text-slate-500">
                  Stored as company records only. Statutory contribution math is enabled in a later phase.
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Phase 2 Compliance:</strong> These numbers are safely recorded for company identification. Statutory contribution deduction formulas are not executed during this phase.
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">SSS Employer Number</label>
                  <input
                    type="text"
                    value={formData.sssEmployerNumber || ''}
                    onChange={(e) => handleChange('sssEmployerNumber', e.target.value)}
                    placeholder="03-0000000-0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">PhilHealth Employer Number</label>
                  <input
                    type="text"
                    value={formData.philHealthEmployerNumber || ''}
                    onChange={(e) => handleChange('philHealthEmployerNumber', e.target.value)}
                    placeholder="00-000000000-0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Pag-IBIG (HDMF) Employer Number</label>
                  <input
                    type="text"
                    value={formData.pagIbigEmployerNumber || ''}
                    onChange={(e) => handleChange('pagIbigEmployerNumber', e.target.value)}
                    placeholder="0000-0000-0000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 5 — Review & Confirm Registration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Verify the corporate configuration prior to committing to the database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Code</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{formData.companyCode}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Legal Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{formData.legalName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Trade / Brand Name</span>
                  <span className="text-slate-800">{formData.tradeName || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TIN Number</span>
                  <span className="font-mono text-slate-800">{formData.tin || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                  <span className="text-slate-800">
                    {[formData.address, formData.city, formData.province, formData.postalCode, formData.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2 font-mono text-[11px]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Statutory Registrations</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>SSS: {formData.sssEmployerNumber || '—'}</div>
                    <div>PhilHealth: {formData.philHealthEmployerNumber || '—'}</div>
                    <div>Pag-IBIG: {formData.pagIbigEmployerNumber || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Action Buttons */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Creating Company...' : 'Save & Register Company'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CompanyProfileWindow: React.FC<{ companyId?: string; onBack?: () => void }> = ({
  companyId: propCompanyId,
  onBack,
}) => {
  const { currentCompany, currentCompanyId, refreshCompanies, setCompany } = useCompanyContext();
  const activeId = propCompanyId || currentCompanyId || currentCompany?.id;

  const [company, setCompanyRecord] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'registration' | 'contact' | 'statutory' | 'payroll' | 'users' | 'audit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateCompanyInput>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeId) return;
    try {
      setIsLoading(true);
      setError(null);
      const record = await companyService.getCompany(activeId);
      setCompanyRecord(record);
      if (record) {
        setEditForm({ ...record });
        const logs = await auditService.getLogsForCompany(record.id);
        setAuditLogs(logs);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load company profile.');
    } finally {
      setIsLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveEdit = async () => {
    if (!company) return;
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);
      const updated = await companyService.updateCompany(company.id, editForm);
      setCompanyRecord(updated);
      setIsEditing(false);
      setSuccessMsg('Company details updated successfully.');
      await refreshCompanies();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update company.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeId || (!company && !isLoading)) {
    return (
      <div className="flex-1 p-8 text-center bg-[#f8fafc] text-slate-500 text-xs">
        <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p>No business entity selected or record not found.</p>
        {onBack && (
          <button onClick={onBack} className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded text-xs">
            ← Return to Company List
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-slate-700">
      {/* Profile Header Banner */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {company?.companyCode || 'CO'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{company?.legalName}</h2>
              {company?.status === 'Active' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                  {company?.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Code: <strong className="text-blue-700">{company?.companyCode}</strong>
              {company?.tradeName ? ` • Trade: ${company.tradeName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {company && (
            <button
              onClick={() => setCompany(company)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Switch Active Context to {company.companyCode}
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm(company || {});
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-1 text-xs shrink-0 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'registration', label: 'Registration & Tax', icon: FileText },
          { id: 'contact', label: 'Contact & Location', icon: MapPin },
          { id: 'statutory', label: 'Employer Statutory', icon: ShieldCheck },
          { id: 'payroll', label: 'Payroll Configuration', icon: Sliders },
          { id: 'users', label: 'Users & Access', icon: Users },
          { id: 'audit', label: 'Audit History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="m-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="m-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc]">
        {company && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Internal ID</span>
                    <span className="font-mono text-xs text-slate-800 break-all">{company.id}</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Record Created</span>
                    <span className="font-mono text-xs text-slate-800">
                      {new Date(company.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Last Updated</span>
                    <span className="font-mono text-xs text-slate-800">
                      {new Date(company.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                    Entity Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-0.5">Company Code</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.companyCode || ''}
                          onChange={(e) => setEditForm({ ...editForm, companyCode: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono uppercase font-bold text-blue-700"
                        />
                      ) : (
                        <span className="font-mono font-bold text-blue-700 text-sm">{company.companyCode}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[11px] mb-0.5">Registered Legal Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.legalName || ''}
                          onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900"
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 text-sm">{company.legalName}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[11px] mb-0.5">Trade / Brand Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.tradeName || ''}
                          onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-800"
                        />
                      ) : (
                        <span className="text-slate-800">{company.tradeName || '—'}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[11px] mb-0.5">Status</label>
                      {isEditing ? (
                        <select
                          value={editForm.status || 'Active'}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as CompanyStatus })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-800 font-semibold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Archived">Archived</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-800">{company.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REGISTRATION TAB */}
            {activeTab === 'registration' && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                  Tax & Business Registration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">Tax Identification Number (TIN)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.tin || ''}
                        onChange={(e) => setEditForm({ ...editForm, tin: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                      />
                    ) : (
                      <span className="font-mono text-slate-900 font-semibold">{company.tin || 'Not registered'}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">BIR RDO District Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.rdoCode || ''}
                        onChange={(e) => setEditForm({ ...editForm, rdoCode: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      />
                    ) : (
                      <span className="text-slate-900 font-medium">{company.rdoCode || 'Not registered'}</span>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block text-[11px] mb-0.5">SEC / DTI Registration Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.businessRegistrationNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, businessRegistrationNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                      />
                    ) : (
                      <span className="font-mono text-slate-900">{company.businessRegistrationNumber || '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT & LOCATION TAB */}
            {activeTab === 'contact' && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                  Official Contact & Address Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block text-[11px] mb-0.5">Office Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      />
                    ) : (
                      <span className="text-slate-900">{company.address || '—'}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      />
                    ) : (
                      <span className="text-slate-900">{company.city || '—'}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">Province</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.province || ''}
                        onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      />
                    ) : (
                      <span className="text-slate-900">{company.province || '—'}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">Telephone</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.contactNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                      />
                    ) : (
                      <span className="font-mono text-slate-900">{company.contactNumber || '—'}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-0.5">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      />
                    ) : (
                      <span className="text-slate-900">{company.email || '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STATUTORY TAB */}
            {activeTab === 'statutory' && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                  Statutory Employer Registrations
                </h3>

                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <strong>Phase 2 Compliance:</strong> Numbers are stored as entity metadata. Statutory formula evaluation is disabled until Phase 3.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">SSS Employer #</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.sssEmployerNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, sssEmployerNumber: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono font-bold text-slate-900">{company.sssEmployerNumber || '—'}</span>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">PhilHealth Employer #</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.philHealthEmployerNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, philHealthEmployerNumber: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono font-bold text-slate-900">{company.philHealthEmployerNumber || '—'}</span>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Pag-IBIG / HDMF #</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.pagIbigEmployerNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, pagIbigEmployerNumber: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono font-bold text-slate-900">{company.pagIbigEmployerNumber || '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PAYROLL PARAMETERS TAB */}
            {activeTab === 'payroll' && (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Payroll Parameters & Calculation Rules</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Available in a later phase. Cutoff schedules, tax brackets, SSS matrix, PhilHealth rates, overtime multipliers, and DTR calculation rules will be implemented in subsequent phases.
                </p>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Assigned User Access
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Foundational Multi-Tenant Model</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                      AD
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">admin (System Administrator)</span>
                      <span className="text-[11px] text-slate-500">Super Admin / Full Access</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Active
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Company-specific role assignments and multi-user permissions will be expanded in a later phase.
                </p>
              </div>
            )}

            {/* AUDIT HISTORY TAB */}
            {activeTab === 'audit' && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Entity Audit Log ({auditLogs.length} Records)
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Immutable Audit Engine Active
                  </span>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No audit logs recorded for this entity yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.2 rounded font-mono text-[9.5px] font-bold ${
                                log.action === 'CREATE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.action === 'ARCHIVE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : log.action === 'RESTORE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="font-semibold text-slate-800">{log.description}</span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-mono">
                            User: {log.userId} • ID: {log.id}
                          </div>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const CompanySettingsWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-2xl mx-auto space-y-4 text-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Company Parameters & Configurations</span>
          </h2>
          <p className="text-slate-500 mt-0.5">
            Entity parameters, statutory cutoffs, and default policies.
          </p>
        </div>

        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Advanced Payroll Engine Parameters</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Available in a later phase. Calculation formulas, grace periods, shift differential policies, and statutory withholding matrices are scheduled for Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
};
