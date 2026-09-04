/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Briefcase, Calendar, CheckSquare, Clock, ShieldAlert, LogOut, FileText, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Project, Candidate, Employee } from '../types';
import { PIPELINE_STATUSES } from '../mockData';

function cleanMeta(val: string | undefined | null): string {
  if (!val) return '';
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (lower === 'meta' || lower === 'n/a' || lower === 'na' || lower === 'undefined' || lower === 'null') {
    return '';
  }
  return s;
}

interface RecruiterDashboardProps {
  projects: Project[];
  candidates: Candidate[];
  employees: Employee[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  currentUser: string;
  onLogout: () => void;
  onAddCandidate: (newCand: Candidate) => void;
  onOpenCandidateDrawer: (id: string) => void;
}

export default function RecruiterDashboard({
  projects,
  candidates,
  employees,
  activeProjectId,
  onSelectProject,
  currentUser,
  onLogout,
  onAddCandidate,
  onOpenCandidateDrawer
}: RecruiterDashboardProps) {
  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState('Fresh');
  const [searchQuery, setSearchQuery] = useState('');

  // Grace period tracker for leads updated from 'Fresh' to another status
  const [gracePeriodLeads, setGracePeriodLeads] = useState<Record<string, { expiry: number; updatedToStatus: string }>>({});

  // Monitor candidate updates to detect 'Fresh' transitions
  const prevCandidatesRef = React.useRef<Candidate[]>([]);
  useEffect(() => {
    const prev = prevCandidatesRef.current;
    if (prev && prev.length > 0) {
      candidates.forEach((curr) => {
        const pre = prev.find((x) => x.id === curr.id);
        // If candidate was Fresh, but is now NOT Fresh
        if (pre && pre.status === 'Fresh' && curr.status !== 'Fresh') {
          setGracePeriodLeads((prevGrace) => ({
            ...prevGrace,
            [curr.id]: {
              expiry: Date.now() + 60000, // 1 minute grace period
              updatedToStatus: curr.status
            }
          }));
        }
      });
    }
    prevCandidatesRef.current = candidates;
  }, [candidates]);

  // Periodically clear expired grace period items
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setGracePeriodLeads((prev) => {
        let changed = false;
        const copy = { ...prev };
        for (const id of Object.keys(copy)) {
          const val = copy[id];
          if (val && now > val.expiry) {
            delete copy[id];
            changed = true;
          }
        }
        return changed ? copy : prev;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Add Candidate modal form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addJobRole, setAddJobRole] = useState('');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAge, setAddAge] = useState('');
  const [addGender, setAddGender] = useState('');
  const [addCurrentJob, setAddCurrentJob] = useState('');
  const [addExperience, setAddExperience] = useState('');
  const [addQualification, setAddQualification] = useState('');
  const [addSkills, setAddSkills] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Filter projects assigned to this recruiter
  const assignedProjects = projects.filter(
    (p) =>
      p.status === 'Active' &&
      (!p.assignedRecruiters ||
        p.assignedRecruiters.length === 0 ||
        p.assignedRecruiters.map((x) => x.toLowerCase()).includes(currentUser.toLowerCase()))
  );

  // Active Project details
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Security Shield: block copying and screenshot commands for recruiters
  useEffect(() => {
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("⚠️ SECURITY WARNING: Copying lead contact numbers and names is restricted on recruiter work boards.");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      const isScreenshotShortcut = (e.ctrlKey || e.metaKey) && (e.shiftKey) && (e.key === 's' || e.key === '4' || e.key === '3');
      const isPrint = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p';
      if (isCopy || isScreenshotShortcut || isPrint) {
        e.preventDefault();
        alert("⚠️ SECURITY COMPLIANCE: Screen capture, file copy, and print shortcuts are restricted.");
      }
    };

    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Helper date filter check
  const inDateFilter = (dateStr: string) => {
    if (dateRange === 'all') return true;
    const now = new Date();
    const targetDate = new Date(dateStr);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      return targetDate >= todayStart;
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(todayStart);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      return targetDate >= startOfWeek;
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(todayStart);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      return targetDate >= startOfMonth;
    } else if (dateRange === 'year') {
      const startOfYear = new Date(todayStart);
      startOfYear.setFullYear(startOfYear.getFullYear() - 1);
      return targetDate >= startOfYear;
    }
    return true;
  };

  // Filter candidates based on active project, date filter, status filter, and query (strictly scoped to this recruiter)
  const projectCandidates = candidates.filter((c) => 
    c.projectId === activeProjectId && 
    c.recruiterName?.toLowerCase() === currentUser.toLowerCase()
  );

  const filteredCandidates = projectCandidates.filter((c) => {
    // Status filter - if filtering by Fresh, allow grace period leads to remain visible
    if (statusFilter === 'Fresh') {
      const inGrace = gracePeriodLeads[c.id] && Date.now() < gracePeriodLeads[c.id].expiry;
      if (c.status !== 'Fresh' && !inGrace) {
        return false;
      }
    } else {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    }

    // Search query active state
    const hasQuery = searchQuery.trim().length > 0;

    // Only apply date filter restriction when NOT actively searching
    if (!hasQuery) {
      const addedDate = c.dateAdded || c.lastUpdated;
      if (!inDateFilter(addedDate)) return false;
    }

    if (hasQuery) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      const qualMatch = (c.highestQualification || '').toLowerCase().includes(q);
      const skillsMatch = (c.primarySkills || '').toLowerCase().includes(q);
      const roleMatch = (c.jobRole || '').toLowerCase().includes(q) || (c.currentJob || '').toLowerCase().includes(q);
      const ageMatch = (c.age || '').toLowerCase().includes(q);
      const genderMatch = (c.gender || '').toLowerCase().includes(q);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      const sourceMatch = (c.source || '').toLowerCase().includes(q);
      const remarksMatch = (c.recruiterRemarks || '').toLowerCase().includes(q);
      
      return (
        nameMatch ||
        phoneMatch ||
        qualMatch ||
        skillsMatch ||
        roleMatch ||
        ageMatch ||
        genderMatch ||
        emailMatch ||
        sourceMatch ||
        remarksMatch
      );
    }

    return true;
  });

  // Sort candidates to implement pure LIFO (Last In First Out)
  // Active/Fresh is on top, then newer/most recently added is on top.
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    // True fresh ones always stay above grace-period updated ones
    const aIsFresh = a.status === 'Fresh' ? 1 : 0;
    const bIsFresh = b.status === 'Fresh' ? 1 : 0;
    if (aIsFresh !== bIsFresh) {
      return bIsFresh - aIsFresh;
    }
    // LIFO based on candidate's creation dateAdded
    const tA = new Date(a.dateAdded || 0).getTime();
    const tB = new Date(b.dateAdded || 0).getTime();
    return tB - tA; // newer/last added goes to the absolute top
  });

  // KPI Calculations (based on date-filtered pipeline)
  const currentKpiCandidates = projectCandidates.filter((c) => inDateFilter(c.dateAdded || c.lastUpdated));
  const totalLeads = currentKpiCandidates.length;
  const callsMade = currentKpiCandidates.filter((c) => c.status !== 'Fresh').length;
  const interested = currentKpiCandidates.filter((c) => c.status === 'Interested').length;
  const notConnected = currentKpiCandidates.filter((c) => c.status === 'Call Not Connected').length;
  const followUp = currentKpiCandidates.filter((c) => c.status === 'Follow up').length;
  const docsSubmitted = currentKpiCandidates.filter((c) => c.status === 'Document Submitted').length;

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'fresh') return 'status-badge status-fresh';
    if (s === 'interested') return 'status-badge status-interested';
    if (s === 'not interested') return 'status-badge status-rejected';
    if (s.startsWith('follow')) return 'status-badge status-followup';
    if (s === 'not suitable') return 'status-badge status-bench';
    if (s.startsWith('call not') || s.startsWith('rnr')) return 'status-badge status-rnr';
    if (s.startsWith('willing')) return 'status-badge status-willing';
    if (s.startsWith('cv sub')) return 'status-badge bg-purple-50 text-purple-700 border border-purple-100';
    if (s.startsWith('document sub')) return 'status-badge bg-amber-50 text-amber-700 border border-amber-100';
    if (s.includes('passed')) return 'status-badge status-passed';
    if (s === 'selected') return 'status-badge status-completed';
    if (s.includes('process')) return 'status-badge status-completed';
    if (s === 'travelled') return 'status-badge status-travelled';
    return 'status-badge status-fresh';
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addJobRole || !addName || !addPhone) {
      alert('Please fill out required fields.');
      return;
    }

    const newCand: Candidate = {
      id: 'cand-' + Date.now(),
      projectId: activeProjectId || '',
      jobRole: addJobRole,
      name: addName.trim(),
      phone: addPhone.trim(),
      email: addEmail.trim(),
      age: addAge,
      gender: addGender,
      currentJob: addCurrentJob.trim(),
      yearsOfExperience: addExperience.trim(),
      highestQualification: addQualification.trim(),
      primarySkills: addSkills.trim(),
      status: 'Fresh',
      source: 'Manual entry',
      dateAdded: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      recruiterName: currentUser,
      documents: { merged: false },
      history: [
        {
          date: new Date().toISOString(),
          fromStatus: '',
          toStatus: 'Fresh',
          notes: addNotes || 'Manually entered recruiter lead',
          recruiter: currentUser
        }
      ]
    };

    onAddCandidate(newCand);
    setIsAddModalOpen(false);

    // Reset fields
    setAddJobRole('');
    setAddName('');
    setAddPhone('');
    setAddEmail('');
    setAddAge('');
    setAddGender('');
    setAddCurrentJob('');
    setAddExperience('');
    setAddQualification('');
    setAddSkills('');
    setAddNotes('');
  };

  const selectProjectAndInit = (id: string) => {
    onSelectProject(id);
    const proj = projects.find((p) => p.id === id);
    if (proj && proj.jobRoles && proj.jobRoles.length > 0) {
      setAddJobRole(proj.jobRoles[0]);
    }
  };

  // Render Selection View
  if (!activeProjectId) {
    return (
      <div className="flex-grow flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-100 py-2 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <img 
              src="https://res.cloudinary.com/dpnb1to3s/image/upload/v1781796016/481778660_1037742571707490_6757743138098457662_n-removebg-preview_omsd29.png" 
              alt="Gowell" 
              className="h-10 w-auto object-contain" 
              referrerPolicy="no-referrer"
            />
            <div className="h-6 w-[1.5px] bg-slate-200" />
            <div>
              <h1 className="text-sm font-extrabold text-slate-800">Gowell International</h1>
              <p className="text-[10px] text-slate-400">Recruiter Campaign Console</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500 font-sans">
              Recruiter:{' '}
              <span className="font-bold text-slate-800 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                {currentUser}
              </span>
            </span>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 font-sans">My Workspace Projects</h2>
              <p className="text-sm text-slate-500 mt-0.5 font-sans">Select project to view pipeline and initiate calling logs.</p>
            </div>
          </div>

          {assignedProjects.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-base font-bold text-slate-700">No Projects Allocated</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                You have not been assigned to any matching dynamic campaigns yet. Contact Gokul or your Admin to coordinate project permissions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {assignedProjects.map((p) => {
                const projectLeads = candidates.filter((c) => 
                  c.projectId === p.id && 
                  c.recruiterName?.toLowerCase() === currentUser.toLowerCase()
                );
                const projectFreshLeads = projectLeads.filter((c) => c.status === 'Fresh');
                return (
                  <div
                    key={p.id}
                    onClick={() => selectProjectAndInit(p.id)}
                    className="premium-card bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                          <MapPin className="w-3 h-3 mr-1" />
                          {p.location || 'India'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{p.openings || 0} Vacancies</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mb-1">{p.name}</h3>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{p.details || 'No Description available'}</p>
                      {p.jobRoles && p.jobRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {p.jobRoles.slice(0, 3).map((role) => (
                            <span key={role} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {role}
                            </span>
                          ))}
                          {p.jobRoles.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{p.jobRoles.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        <span className="font-bold text-slate-800">{projectLeads.length}</span> Allocated Leads
                      </span>
                      <span className="flex items-center text-emerald-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                        {projectFreshLeads.length} Fresh
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Render Recruiter Workspace Dashboard view
  return (
    <div className="flex-grow flex flex-col min-h-screen select-none">
      <header className="bg-white border-b border-slate-100 py-2 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <img 
            src="https://res.cloudinary.com/dpnb1to3s/image/upload/v1781796016/481778660_1037742571707490_6757743138098457662_n-removebg-preview_omsd29.png" 
            alt="Gowell" 
            className="h-10 w-auto object-contain" 
            referrerPolicy="no-referrer"
          />
          <div className="h-6 w-[1.5px] bg-slate-200" />
          <h2 className="text-xs font-extrabold text-slate-800 sm:text-sm">
            Project Workspace: <span className="text-brand-600">{activeProject?.name}</span>
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSelectProject(null)}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg bg-white hover:bg-slate-50 transition-all select-none"
          >
            ⇄ Switch Project
          </button>
          <button
            onClick={onLogout}
            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Filters Navigation */}
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex-wrap gap-3">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500">Recruiter Period:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {(['today', 'week', 'month', 'year', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    dateRange === r ? 'bg-brand-500 text-white font-semibold' : 'text-slate-600 hover:text-brand-600'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
            Automatic Buffer Offline Sync
          </span>
        </div>

        {/* Dynamic Metric Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">👤</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Allocated</p>
              <h4 className="text-xl font-extrabold text-slate-800">{totalLeads}</h4>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 font-bold">📞</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Calls</p>
              <h4 className="text-xl font-extrabold text-slate-800">{callsMade}</h4>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 font-bold">👍</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Interested</p>
              <h4 className="text-xl font-extrabold text-slate-800">{interested}</h4>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 font-bold">🚫</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Not Connected</p>
              <h4 className="text-xl font-extrabold text-slate-800">{notConnected}</h4>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold">📅</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Follow Up</p>
              <h4 className="text-xl font-extrabold text-slate-800">{followUp}</h4>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold">📄</div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Doc Submitted</p>
              <h4 className="text-xl font-extrabold text-slate-800">{docsSubmitted}</h4>
            </div>
          </div>
        </section>

        {/* Tab & Filter Selection table */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <label htmlFor="recruiter-status-filter" className="text-xs font-bold text-slate-500 select-none">
                Pipeline Status:
              </label>
              <select
                id="recruiter-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm text-slate-700"
              >
                <option value="all">All Allocated Statuses</option>
                {PIPELINE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <input
                  type="text"
                  placeholder="Quick lookup name, phone, roles, etc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                onClick={() => {
                  if (activeProject && activeProject.jobRoles.length > 0) {
                    setAddJobRole(activeProject.jobRoles[0]);
                  }
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/30 transition-all flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Lead
              </button>
            </div>
          </div>

          {/* Candidates table card board */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {sortedCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No Pipeline Records found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    No allocated leads found match the current status filter, date range select or search lookup values.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Candidate</th>
                      <th className="px-5 py-3.5">Job Role</th>
                      <th className="px-5 py-3.5">Qualification</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Last Action / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedCandidates.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => onOpenCandidateDrawer(c.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">{c.name || 'Anonymous Lead'}</span>
                            <span className="text-sm font-extrabold text-slate-900 mt-0.5">{c.phone}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                          {cleanMeta(c.jobRole) || cleanMeta(c.currentJob) || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[160px] truncate">
                          {cleanMeta(c.highestQualification) || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400 font-medium">
                          {new Date(c.lastUpdated || c.dateAdded).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Dynamic Lead add form modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm shadow-inner" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 font-sans">
                <Briefcase className="w-5 h-5 text-brand-500" />
                Add New Candidate Lead
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto px-6 py-5">
              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                {/* Dynamically bind Project Job roles */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Allocated Job Role *</label>
                  <select
                    value={addJobRole}
                    required
                    onChange={(e) => setAddJobRole(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                  >
                    <option value="">-- Choose Allocations --</option>
                    {activeProject?.jobRoles?.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="font-bold text-slate-600 block mb-1">Candidate Profile Name *</label>
                    <input
                      type="text"
                      value={addName}
                      required
                      placeholder="e.g. Anandha Selvan"
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white hover:border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={addPhone}
                      required
                      placeholder="+91 98xxxxxxxx"
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Email ID</label>
                    <input
                      type="email"
                      value={addEmail}
                      placeholder="e.g. candidate@gmail.com"
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Age</label>
                    <input
                      type="number"
                      value={addAge}
                      placeholder="Age"
                      onChange={(e) => setAddAge(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Gender</label>
                    <select
                      value={addGender}
                      onChange={(e) => setAddGender(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Choose Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Current Job Role</label>
                    <input
                      type="text"
                      value={addCurrentJob}
                      placeholder="Current Organization Title"
                      onChange={(e) => setAddCurrentJob(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Overall Experience *</label>
                    <input
                      type="text"
                      value={addExperience}
                      required
                      placeholder="e.g. 1.5 Years"
                      onChange={(e) => setAddExperience(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-slate-600 block mb-1">Highest Qualification Level *</label>
                    <input
                      type="text"
                      value={addQualification}
                      required
                      placeholder="e.g. BBA Graduate, High School Pass"
                      onChange={(e) => setAddQualification(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-slate-600 block mb-1">Primary Core Skills / Focus Areas *</label>
                    <input
                      type="text"
                      value={addSkills}
                      required
                      placeholder="e.g. Sales pitch, Customer grievance, English fluent"
                      onChange={(e) => setAddSkills(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Initial Dynamic Remarks / Field Notes</label>
                  <textarea
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Enter first impressions, references, walk-in descriptors..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/30 transition-all mt-2 active:scale-[0.98]"
                >
                  Save New Lead
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
