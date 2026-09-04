/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users, Key, Settings, Briefcase, FileText, Trash2, Edit, AlertCircle, Plus, X, ListCollapse, ToggleLeft, ClipboardCheck,
  TrendingUp, Calendar, Search, MapPin, DownloadCloud, CheckSquare, UploadCloud, Eye, AlertTriangle, ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Project, Candidate, Employee, FutureBenchEntry, SubmittedDoc, DistributionLog, CustomField } from '../types';
import { PIPELINE_STATUSES } from '../mockData';

interface ManagerPortalProps {
  projects: Project[];
  candidates: Candidate[];
  employees: Employee[];
  futureBench: FutureBenchEntry[];
  submittedDocs: SubmittedDoc[];
  distributionLog: DistributionLog[];
  apiUrl: string;
  onUpdateApiUrl: (url: string) => void;
  currentUser: string;
  onLogout: () => void;
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onAddEmployee: (emp: Employee) => void;
  onAddProject: (p: Project) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onDistributeLeads: (leads: any[], projectId: string, jobRole: string, recruiterCounts: Record<string, number>) => void;
  showToast: (title: string, msg: string, type?: 'success' | 'warning' | 'info') => void;
  cvFolderId?: string;
  setCvFolderId?: (id: string) => void;
  key?: string;
}

export default function ManagerPortal({
  projects,
  candidates,
  employees,
  futureBench,
  submittedDocs,
  distributionLog,
  apiUrl,
  onUpdateApiUrl,
  currentUser,
  onLogout,
  activeProjectId,
  onSelectProject,
  onAddEmployee,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onDistributeLeads,
  showToast,
  cvFolderId = '1w43JAQYD_MgNqgsUFeWloYsydKFVgnsu',
  setCvFolderId
}: ManagerPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'documents' | 'distribute' | 'projects' | 'employees' | 'bench' | 'settings'>(
    activeProjectId ? 'dashboard' : 'projects'
  );

  useEffect(() => {
    if (!activeProjectId && ['dashboard', 'reports', 'documents', 'distribute'].includes(activeTab)) {
      setActiveTab('projects');
    }
  }, [activeProjectId, activeTab]);

  // Daily KPIs today date check
  const todayStr = new Date().toISOString().slice(0, 10);
  const getTodayCandidates = () => {
    return candidates.filter((c) => {
      const d = c.lastUpdated || c.dateAdded || '';
      return d.slice(0, 10) === todayStr;
    });
  };

  // KPI Calculations
  const todayLeads = getTodayCandidates();
  const todayCalls = todayLeads.filter((c) => c.status !== 'Fresh').length;
  const todayInterested = todayLeads.filter((c) => c.status === 'Interested').length;
  const todayDocs = todayLeads.filter((c) => c.status === 'Document Submitted' || c.status === 'CV Submitted').length;
  const todayPassed = todayLeads.filter((c) => c.status === 'Interview Passed' || c.status === 'Exam Passed').length;
  const todayRejected = todayLeads.filter((c) => c.status === 'Not Interested' || c.status === 'Not Suitable').length;
  const todayFollowUp = todayLeads.filter((c) => c.status === 'Follow up').length;
  const todayCompleted = todayLeads.filter((c) => ['travelled', 'selected', 'in processing'].includes(c.status.toLowerCase())).length;

  // Active Project
  const activeProj = projects.find((p) => p.id === activeProjectId);

  // Filter recruiters for various selectors
  const recruiters = employees.filter((e) => e.designation !== 'Manager');

  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);

  // =========================================================================
  // TAB 1: REPORTS filters & states
  // =========================================================================
  const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportRecruiter, setReportRecruiter] = useState('all');
  const [reportProject, setReportProject] = useState('all');
  const [reportStatus, setReportStatus] = useState('all');

  const checkInDateRange = (dateStr: string, range: string, fromDt?: string, toDt?: string) => {
    if (range === 'all') return true;
    const now = new Date();
    const target = new Date(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'today') {
      return target >= today;
    } else if (range === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return target >= startOfWeek;
    } else if (range === 'month') {
      const startOfMonth = new Date(today);
      startOfMonth.setMonth(now.getMonth() - 1);
      return target >= startOfMonth;
    } else if (range === 'year') {
      const startOfYear = new Date(today);
      startOfYear.setFullYear(now.getFullYear() - 1);
      return target >= startOfYear;
    } else if (range === 'custom') {
      const from = fromDt ? new Date(fromDt) : null;
      const to = toDt ? new Date(toDt + 'T23:59:59') : null;
      if (from && target < from) return false;
      if (to && target > to) return false;
      return true;
    }
    return true;
  };

  // Computed filtered candidates for report
  const filteredReportCandidates = candidates.filter((c) => {
    // If inside an active project context, auto restrict candidates, otherwise use selected reportProject
    if (activeProjectId) {
      if (c.projectId !== activeProjectId) return false;
    } else {
      if (reportProject !== 'all' && c.projectId !== reportProject) return false;
    }
    // Recruiter filter
    if (reportRecruiter !== 'all' && c.recruiterName !== reportRecruiter) return false;
    // Status filter
    if (reportStatus !== 'all' && c.status !== reportStatus) return false;
    // Date filter
    const addedDate = c.lastUpdated || c.dateAdded || '';
    return checkInDateRange(addedDate, reportDateRange, reportDateFrom, reportDateTo);
  });

  // KPI Calculations of Reports Filtered set (strictly matching recruitment statuses)
  const repCalls = filteredReportCandidates.filter((c) => c.status !== 'Fresh').length;
  const repInterested = filteredReportCandidates.filter((c) => c.status === 'Interested').length;
  const repRejected = filteredReportCandidates.filter((c) => c.status === 'Not Interested' || c.status === 'Not Suitable').length;
  const repFollowUp = filteredReportCandidates.filter((c) => c.status === 'Follow up').length;
  const repBench = filteredReportCandidates.filter((c) => c.status === 'Not Suitable').length;
  const repWilling = filteredReportCandidates.filter((c) => c.status === 'Willing to Attend Interview').length;
  const repPassed = filteredReportCandidates.filter((c) => c.status === 'Interview Passed' || c.status === 'Exam Passed').length;
  const repCompleted = filteredReportCandidates.filter((c) => c.status === 'In Processing').length;
  const repTravelled = filteredReportCandidates.filter((c) => c.status === 'Travelled' || c.status === 'Selected').length;
  const repDocs = filteredReportCandidates.filter((c) => c.status === 'Document Submitted' || c.status === 'CV Submitted').length;

  // =========================================================================
  // TAB 2: SUBMITTED DOCUMENTS filters & state
  // =========================================================================
  const [docDateRange, setDocDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [docDateFrom, setDocDateFrom] = useState('');
  const [docDateTo, setDocDateTo] = useState('');
  const [docRecruiterFilter, setDocRecruiterFilter] = useState('all');
  const [docJobRoleFilter, setDocJobRoleFilter] = useState('all');

  const filteredDocs = submittedDocs.filter((d) => {
    // Recruiter filter
    if (docRecruiterFilter !== 'all' && d.recruiterName !== docRecruiterFilter) return false;
    // Project filter workspace restriction
    if (activeProjectId) {
      const activeProjName = activeProj?.name || '';
      if (d.post !== activeProjName) return false;
    }
    // Job Role filter
    if (docJobRoleFilter !== 'all') {
      const cand = candidates.find((c) => c.phone === d.phoneNumber || c.name === d.candidateName);
      const jobRole = d.jobRole || cand?.jobRole || '';
      if (jobRole !== docJobRoleFilter) return false;
    }
    // Date filter
    return checkInDateRange(d.date, docDateRange, docDateFrom, docDateTo);
  });

  const periodDocs = submittedDocs.filter((d) => {
    // Project filter workspace restriction
    if (activeProjectId) {
      const activeProjName = activeProj?.name || '';
      if (d.post !== activeProjName) return false;
    }
    // Date filter
    return checkInDateRange(d.date, docDateRange, docDateFrom, docDateTo);
  });

  const docSummaryToday = submittedDocs.filter((d) => checkInDateRange(d.date, 'today')).length;
  const docSummaryWeek = submittedDocs.filter((d) => checkInDateRange(d.date, 'week')).length;
  const docSummaryRate = candidates.length > 0 ? Math.round((filteredDocs.length / candidates.length) * 100) : 0;

  const exportToExcelSheet = (aoa: any[][], filename: string) => {
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExportReportToExcel = () => {
    const headers = ['Name', 'Phone', 'Age', 'Gender', 'Email', 'Source', 'Qualifications', 'Skills', 'Job Role', 'Status', 'Date Added', 'Last Changed', 'Recruiter Remarks'];
    const rows = filteredReportCandidates.map((c) => [
      c.name || '—',
      c.phone || '—',
      c.age || '—',
      c.gender || '—',
      c.email || '—',
      c.source || '—',
      c.highestQualification || '—',
      c.primarySkills || '—',
      c.jobRole || c.currentJob || '—',
      c.status || '—',
      c.dateAdded ? new Date(c.dateAdded).toLocaleString() : '—',
      c.lastUpdated ? new Date(c.lastUpdated).toLocaleString() : '—',
      c.recruiterRemarks || '—'
    ]);
    exportToExcelSheet([headers, ...rows], `Reports_Audit_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportDocsToExcel = () => {
    const headers = ['Date Submitted', 'Recruiter Name', 'Candidate Name', 'Phone Number', 'Job Role', 'File Link'];
    const rows = filteredDocs.map((d) => {
      const cand = candidates.find((c) => c.phone === d.phoneNumber || c.name === d.candidateName);
      const jobRole = d.jobRole || cand?.jobRole || '—';
      return [
        new Date(d.date).toLocaleString(),
        d.recruiterName || '—',
        d.candidateName || '—',
        d.phoneNumber || '—',
        jobRole,
        d.documentLink || '—'
      ];
    });
    exportToExcelSheet([headers, ...rows], `Documents_Logged_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportBenchToExcel = () => {
    const headers = ['Candidate Name', 'Phone', 'Qualifications', 'Fit Category', 'Fit Remarks', 'Logged Recruiter', 'Logged Date', 'Source Campaign'];
    const rows = filteredBench.map((b) => [
      b.name || '—',
      b.phone || '—',
      b.qualification || '—',
      b.category || '—',
      b.remarks || '—',
      b.recruiterName || '—',
      b.dateTagged ? new Date(b.dateTagged).toLocaleString() : '—',
      b.sourceProjectName || 'Campaign'
    ]);
    exportToExcelSheet([headers, ...rows], `Talent_Bench_Export_${new Date().toISOString().slice(0, 10)}`);
  };

  // =========================================================================
  // TAB 3: LEAD DISTRIBUTION pipeline
  // =========================================================================
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [distProject, setDistProject] = useState('');
  const [distJobRole, setDistJobRole] = useState('');
  const [recruiterAllocCounts, setRecruiterAllocCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeProjectId) {
      setDistProject(activeProjectId);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (distProject) {
      const proj = projects.find((p) => p.id === distProject);
      if (proj && proj.jobRoles && proj.jobRoles.length > 0) {
        setDistJobRole(proj.jobRoles[0]);
      } else {
        setDistJobRole('');
      }
    }
  }, [distProject, projects]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rows.length === 0) throw new Error('File is empty.');

        let leads: any[] = [];
        let nameIdx = -1, phoneIdx = -1, qualIdx = -1, postIdx = -1, emailIdx = -1, notesIdx = -1;
        const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());

        const isHeader = headers.some(
          (h: any) =>
            h.includes('name') ||
            h.includes('phone') ||
            h.includes('mobile') ||
            h.includes('contact') ||
            h.includes('number') ||
            h.includes('qualification') ||
            h.includes('degree') ||
            h.includes('post') ||
            h.includes('role') ||
            h.includes('job') ||
            h.includes('email') ||
            h.includes('mail') ||
            h.includes('notes')
        );

        let startRow = 1;
        if (isHeader) {
          headers.forEach((h: string, idx: number) => {
            if (h.includes('name')) nameIdx = idx;
            else if (h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number')) phoneIdx = idx;
            else if (h.includes('qualification') || h.includes('degree')) qualIdx = idx;
            else if (h.includes('role') || h.includes('post') || h.includes('job')) postIdx = idx;
            else if (h.includes('email') || h.includes('mail')) emailIdx = idx;
            else if (h.includes('notes') || h.includes('remark')) notesIdx = idx;
          });
        }

        // Apply clean fallbacks if not detected
        if (nameIdx === -1) nameIdx = 0;
        if (phoneIdx === -1) phoneIdx = 1;
        if (emailIdx === -1) emailIdx = 2;
        if (postIdx === -1) postIdx = 3;
        if (qualIdx === -1) qualIdx = 4;

        if (!isHeader) {
          startRow = 0;
        }

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const name = String(nameIdx !== -1 && row[nameIdx] !== undefined && row[nameIdx] !== null ? row[nameIdx] : '').trim();
          const phone = String(phoneIdx !== -1 && row[phoneIdx] !== undefined && row[phoneIdx] !== null ? row[phoneIdx] : '').trim();
          const email = String(emailIdx !== -1 && row[emailIdx] !== undefined && row[emailIdx] !== null ? row[emailIdx] : '').trim();
          const qual = String(qualIdx !== -1 && row[qualIdx] !== undefined && row[qualIdx] !== null ? row[qualIdx] : '').trim();
          const post = String(postIdx !== -1 && row[postIdx] !== undefined && row[postIdx] !== null ? row[postIdx] : '').trim();
          const notes = String(notesIdx !== -1 && row[notesIdx] !== undefined && row[notesIdx] !== null ? row[notesIdx] : '').trim();

          // Only phone (number) is strictly mandatory
          if (phone) {
            leads.push({ name, phone, email, qualification: qual, post, notes });
          }
        }

        if (leads.length === 0) throw new Error('No valid candidates found.');
        setRawLeads(leads);
        showToast('Success', `Loaded ${leads.length} leads from spreadsheet.`, 'success');
      } catch (err: any) {
        showToast('Error', err.message || 'Error parsing file.', 'warning');
        setUploadedFileName('');
        setRawLeads([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRecruiterAllocChange = (recName: string, countStr: string) => {
    const val = parseInt(countStr) || 0;
    setRecruiterAllocCounts((prev) => ({
      ...prev,
      [recName]: val
    }));
  };

  const handleAllocSpecificRecruiter = (recName: string) => {
    const count = recruiterAllocCounts[recName] || 0;
    if (count <= 0) {
      showToast('Required', 'Please enter allocation count.', 'warning');
      return;
    }
    if (!distProject) {
      showToast('Required', 'Please select a campaign project first.', 'warning');
      return;
    }
    if (count > rawLeads.length) {
      showToast('Error', `Only ${rawLeads.length} leads available.`, 'warning');
      return;
    }

    const assignedLeadsSlice = rawLeads.slice(0, count);
    const remainingLeads = rawLeads.slice(count);

    onDistributeLeads(assignedLeadsSlice, distProject, distJobRole, { [recName]: count });
    setRawLeads(remainingLeads);

    // Clear count
    setRecruiterAllocCounts((prev) => ({ ...prev, [recName]: 0 }));
  };

  const handleDistributeAll = () => {
    if (!distProject) {
      showToast('Required', 'Please choose project campaign.', 'warning');
      return;
    }
    const allocPairs = Object.entries(recruiterAllocCounts).filter(([_, count]) => (count as number) > 0);
    const totalAllocSum = allocPairs.reduce((s, [_, count]) => s + (count as number), 0);

    if (totalAllocSum === 0) {
      showToast('Required', 'Enter allocation tallies first.', 'warning');
      return;
    }
    if (totalAllocSum > rawLeads.length) {
      showToast('Error', `Allocation tallies (${totalAllocSum}) exceed buffer (${rawLeads.length}).`, 'warning');
      return;
    }

    onDistributeLeads(rawLeads, distProject, distJobRole, recruiterAllocCounts);
    
    // Slice off all distributed
    setRawLeads((prev) => prev.slice(totalAllocSum));
    // Clear distributions state
    setRecruiterAllocCounts({});
  };

  const handleRemoveSpreadsheet = () => {
    setRawLeads([]);
    setUploadedFileName('');
  };

  // =========================================================================
  // TAB 4: PROJECTS Creation & CRUD
  // =========================================================================
  const [projName, setProjName] = useState('');
  const [projVacancies, setProjVacancies] = useState('');
  const [projLocation, setProjLocation] = useState('');
  const [projDetails, setProjDetails] = useState('');
  const [projRoles, setProjRoles] = useState<string[]>(['']);
  const [projRecruiters, setProjRecruiters] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Editing modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjId, setEditingProjId] = useState('');
  const [editProjName, setEditProjName] = useState('');
  const [editProjLocation, setEditProjLocation] = useState('');
  const [editProjVacancies, setEditProjVacancies] = useState('');
  const [editProjDetails, setEditProjDetails] = useState('');
  const [editProjRoles, setEditProjRoles] = useState<string[]>([]);
  const [editProjRecruiters, setEditProjRecruiters] = useState<string[]>([]);
  const [editProjStatus, setEditProjStatus] = useState<'Active' | 'Completed' | 'Stopped' | 'Deleted'>('Active');

  const handleRoleCountChange = (idx: number, val: string) => {
    const updated = [...projRoles];
    updated[idx] = val;
    setProjRoles(updated);
  };

  const handleAddRoleRow = () => {
    setProjRoles((prev) => [...prev, '']);
  };

  const handleRemoveRoleRow = (idx: number) => {
    setProjRoles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Custom Field Creator states
  const handleAddCustomFieldBuilder = () => {
    const newF: CustomField = {
      id: 'cf-' + Date.now() + '-' + Math.floor(Math.random() * 100),
      label: '',
      type: 'text',
      required: false,
      options: []
    };
    setCustomFields((prev) => [...prev, newF]);
  };

  const handleCustomFieldChange = (idx: number, prop: keyof CustomField, val: any) => {
    const updated = [...customFields];
    updated[idx] = {
      ...updated[idx],
      [prop]: val
    };
    setCustomFields(updated);
  };

  const handleRecruiterCheckChange = (recName: string, checked: boolean) => {
    if (checked) {
      setProjRecruiters((v) => [...v, recName]);
    } else {
      setProjRecruiters((v) => v.filter((x) => x !== recName));
    }
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoles = projRoles.map((r) => r.trim()).filter(Boolean);

    if (!projName || cleanRoles.length === 0 || projRecruiters.length === 0) {
      showToast('Validation Error', 'Fill in Name, add at least 1 role, and allocate recruiters.', 'warning');
      return;
    }

    const nProj: Project = {
      id: 'proj-' + Date.now(),
      name: projName.trim(),
      location: projLocation.trim(),
      openings: parseInt(projVacancies) || 0,
      details: projDetails.trim(),
      jobRoles: cleanRoles,
      customFields,
      assignedRecruiters: projRecruiters,
      createdBy: currentUser,
      createdDate: new Date().toISOString(),
      status: 'Active'
    };

    onAddProject(nProj);

    // Reset Form
    setProjName('');
    setProjVacancies('');
    setProjLocation('');
    setProjDetails('');
    setProjRoles(['']);
    setProjRecruiters([]);
    setCustomFields([]);
  };

  // Editing Project handlers
  const handleOpenEditModal = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditProjName(proj.name);
    setEditProjLocation(proj.location || '');
    setEditProjVacancies(String(proj.openings || 0));
    setEditProjDetails(proj.details || '');
    setEditProjRoles(proj.jobRoles || ['']);
    setEditProjRecruiters(proj.assignedRecruiters || []);
    setEditProjStatus(proj.status || 'Active');
    setIsEditModalOpen(true);
  };

  const handleEditRoleCountChange = (idx: number, val: string) => {
    const updated = [...editProjRoles];
    updated[idx] = val;
    setEditProjRoles(updated);
  };

  const handleEditRoleRowAdd = () => {
    setEditProjRoles((prev) => [...prev, '']);
  };

  const handleEditRoleRowRemove = (idx: number) => {
    setEditProjRoles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditRecruiterCheckChange = (recName: string, checked: boolean) => {
    if (checked) {
      setEditProjRecruiters((v) => [...v, recName]);
    } else {
      setEditProjRecruiters((v) => v.filter((x) => x !== recName));
    }
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoles = editProjRoles.map((r) => r.trim()).filter(Boolean);

    if (!editProjName || cleanRoles.length === 0 || editProjRecruiters.length === 0) {
      showToast('Validation Error', 'Fill in Name, add at least 1 role, and allocate recruiters.', 'warning');
      return;
    }

    const updatedProj: Project = {
      ...projects.find((p) => p.id === editingProjId)!,
      name: editProjName.trim(),
      location: editProjLocation.trim(),
      openings: parseInt(editProjVacancies) || 0,
      details: editProjDetails.trim(),
      jobRoles: cleanRoles,
      assignedRecruiters: editProjRecruiters,
      status: editProjStatus
    };

    onUpdateProject(updatedProj);
    setIsEditModalOpen(false);
  };

  // =========================================================================
  // TAB 5: EMPLOYEES Form CRUD
  // =========================================================================
  const [empName, setEmpName] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empDesignation || !empUsername || !empPassword) {
      showToast('Validation Error', 'All employee fields are required.', 'warning');
      return;
    }

    if (employees.some((em) => em.username.toLowerCase() === empUsername.trim().toLowerCase())) {
      showToast('Error', 'Username already exists.', 'warning');
      return;
    }

    const nEmp: Employee = {
      name: empName.trim(),
      designation: empDesignation,
      username: empUsername.trim().toLowerCase(),
      password: empPassword.trim()
    };

    onAddEmployee(nEmp);

    // Reset Form
    setEmpName('');
    setEmpDesignation('');
    setEmpUsername('');
    setEmpPassword('');
  };

  // =========================================================================
  // TAB 6: BENCH filters & states
  // =========================================================================
  const [benchCategory, setBenchCategory] = useState('all');
  const [benchRecruiter, setBenchRecruiter] = useState('all');
  const [benchSearch, setBenchSearch] = useState('');

  const filteredBench = futureBench.filter((b) => {
    if (benchCategory !== 'all' && b.category !== benchCategory) return false;
    if (benchRecruiter !== 'all' && b.recruiterName !== benchRecruiter) return false;
    if (benchSearch.trim()) {
      const q = benchSearch.toLowerCase();
      const nMatch = b.name.toLowerCase().includes(q);
      const pMatch = b.phone.includes(q);
      const cMatch = b.category.toLowerCase().includes(q);
      return nMatch || pMatch || cMatch;
    }
    return true;
  });

  const benchCategoriesMap: Record<string, number> = {};
  futureBench.forEach((b) => {
    const cat = b.category ? b.category.trim() : 'Uncategorized';
    benchCategoriesMap[cat] = (benchCategoriesMap[cat] || 0) + 1;
  });

  const topBenchCategories = Object.entries(benchCategoriesMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // =========================================================================
  // TAB 7: SETTINGS sync testing
  // =========================================================================
  const [testUrl, setTestUrl] = useState(apiUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
  const [testResponseText, setTestResponseText] = useState('');

  const handleSaveApiUrl = async () => {
    onUpdateApiUrl(testUrl.trim());
    if (!testUrl.trim()) {
      showToast('Cleared', 'Google Sheet Connected API Endpoint URL cleared.', 'info');
      setTestStatus('idle');
      return;
    }

    setTestStatus('testing');
    try {
      const res = await fetch(`${testUrl.trim()}?action=getEmployees`);
      const data = await res.json();
      if (data.success) {
        setTestStatus('success');
        setTestResponseText(`✅ Connection active! Verified successfully. ${data.data.length} employees found.`);
        showToast('Sheets Connected', 'Synchronisation link established successfully!', 'success');
      } else {
        setTestStatus('failure');
        setTestResponseText(`❌ Connected, but API endpoint reported error: ${data.error}`);
      }
    } catch (err: any) {
      setTestStatus('failure');
      setTestResponseText(`❌ Offline or CORS error. Verify Sheets Deployment parameters.`);
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen">
      {/* Sticky Premium Header Bar */}
      <header className="bg-white border-b border-slate-100 py-2 px-6 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm sticky top-0 z-20 gap-3">
        <div className="flex items-center space-x-3">
          <img 
            src="https://res.cloudinary.com/dpnb1to3s/image/upload/v1781796016/481778660_1037742571707490_6757743138098457662_n-removebg-preview_omsd29.png" 
            alt="Gowell" 
            className="h-10 w-auto object-contain" 
            referrerPolicy="no-referrer"
          />
          <div className="h-6 w-[1.5px] bg-slate-200" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2 font-sans">
              Gowell International
              <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full capitalize">
                {employees.find(e => e.name === currentUser)?.designation || 'Manager'} Console
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Active Workspace / Project Indicator */}
          {activeProjectId && (
            <div className="flex items-center space-x-2.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl font-sans text-xs">
              <span className="text-emerald-800 font-extrabold flex items-center gap-1.5 select-none">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Opened Project: {activeProj?.name}
              </span>
              <button
                onClick={() => {
                  onSelectProject(null);
                  setActiveTab('projects');
                }}
                className="text-[10px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded-lg font-bold transition-all"
              >
                Close Project
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3 border-l border-slate-100 pl-3">
            <span className="text-[11px] text-slate-500 font-sans font-medium">
              User: <span className="font-bold text-slate-700">{currentUser}</span>
            </span>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-100 px-2.5 py-1.5 rounded-xl font-sans"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Divided Tab Navigation WITHOUT category headings, with sync settings condition */}
      <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex flex-wrap items-center gap-2 overflow-x-auto">
        {/* If a project is open, show project contextual menus */}
        {activeProjectId && (
          <>
            {(
              [
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'reports', label: '📊 Reports Audit' },
                { id: 'documents', label: '📄 Document Submitted' },
                { id: 'distribute', label: '📤 Leads Allocator' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 px-3.5 text-xs font-bold whitespace-nowrap rounded-xl transition-all font-sans ${
                  activeTab === t.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-100/50'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="h-4 w-[1px] bg-slate-200 mx-1.5 hidden sm:block" />
          </>
        )}

        {/* General/Common menus always shown */}
        {(
          [
            { id: 'projects', label: '🗂️ Recruitment Projects' },
            { id: 'employees', label: '👤 Recruiters Portfolio' },
            { id: 'bench', label: '🗃️ Talent Bench' }
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-2 px-3.5 text-xs font-bold whitespace-nowrap rounded-xl transition-all font-sans ${
              activeTab === t.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-100/50'
            }`}
          >
            {t.label}
          </button>
        ))}

        {/* Sync Settings tab - EXCLUSIVELY hide from public (only show if currentUser is Gokul) */}
        {currentUser === 'Gokul' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3.5 text-xs font-bold whitespace-nowrap rounded-xl transition-all font-sans ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-100/50'
            }`}
          >
            ⚙️ Sync Settings
          </button>
        )}
      </div>

      {/* Workspace Panel Box */}
      <div className="flex-grow p-6 bg-slate-50/50">
        <p className="sr-only">Active view partition panel</p>
        <>
          {/* ========================================================================= */}
          {/* TAB Panel: Dashboard */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Daily stats summary line */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: 'Today\'s Calls', count: todayCalls, bg: 'bg-white border-slate-200' },
                { label: 'Today Interested', count: todayInterested, bg: 'bg-teal-50 border-teal-100 text-teal-800' },
                { label: 'Today Doc Submitted', count: todayDocs, bg: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
                { label: 'Today Interview/Exam Passed', count: todayPassed, bg: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
                { label: 'Today Not Interested / Not Suitable', count: todayRejected, bg: 'bg-rose-50 border-rose-100 text-rose-800' },
                { label: 'Today Follow-Up', count: todayFollowUp, bg: 'bg-violet-50 border-violet-100 text-violet-800' },
                { label: 'Today Selected / Travelled', count: todayCompleted, bg: 'bg-cyan-50 border-cyan-100 text-cyan-800' }
              ].map((c, i) => (
                <div key={i} className={`p-4 rounded-2xl border text-center font-sans tracking-wide shadow-sm ${c.bg}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{c.label}</p>
                  <h4 className="text-xl font-extrabold mt-1">{c.count}</h4>
                </div>
              ))}
            </div>

            {/* Recruiter Live Matrix table */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recruiter Productivity & Call Metrics Breakdown
                </h3>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Live Performance Matrix
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr className="text-center">
                      <th className="px-5 py-3.5 text-left">Recruiter Name</th>
                      <th className="px-5 py-3.5">Assigned Candidates</th>
                      <th className="px-5 py-3.5">Fresh (Uncalled)</th>
                      <th className="px-5 py-3.5 font-sans">Interested</th>
                      <th className="px-5 py-3.5 font-sans">Not Interested</th>
                      <th className="px-5 py-3.5">Not Connected (RNR)</th>
                      <th className="px-5 py-3.5">Follow Up</th>
                      <th className="px-5 py-3.5">Document Submitted</th>
                      <th className="px-5 py-3.5 text-brand-600">Travelled / Selected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-center">
                    {recruiters.map((r) => {
                      const recCandidates = candidates.filter((c) => c.recruiterName === r.name);
                      return (
                        <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-left font-bold text-slate-800">{r.name}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">{recCandidates.length}</td>
                          <td className="px-5 py-3.5 text-blue-600">{recCandidates.filter((c) => c.status === 'Fresh').length}</td>
                          <td className="px-5 py-3.5 text-teal-600">{recCandidates.filter((c) => c.status === 'Interested').length}</td>
                          <td className="px-5 py-3.5 text-rose-600">{recCandidates.filter((c) => c.status === 'Not Interested').length}</td>
                          <td className="px-5 py-3.5 text-violet-600">{recCandidates.filter((c) => c.status === 'Call Not Connected').length}</td>
                          <td className="px-5 py-3.5 text-amber-600">{recCandidates.filter((c) => c.status === 'Follow up').length}</td>
                          <td className="px-5 py-3.5 text-indigo-600">{recCandidates.filter((c) => c.status === 'Document Submitted').length}</td>
                          <td className="px-5 py-3.5 text-emerald-600 font-bold">
                            {recCandidates.filter((c) => ['travelled', 'selected', 'in processing'].includes(c.status.toLowerCase())).length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Reports */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reports Query Builder Filters</h3>
              <div className="flex flex-wrap gap-4 items-end">
                {/* Date quick toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Date Period</label>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                    {(['today', 'week', 'month', 'year', 'all'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setReportDateRange(r)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          reportDateRange === r ? 'bg-brand-500 text-white font-bold' : 'text-slate-600 hover:text-brand-600'
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                    <button
                      onClick={() => setReportDateRange('custom')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        reportDateRange === 'custom' ? 'bg-brand-500 text-white font-bold' : 'text-slate-600 hover:text-brand-600'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {reportDateRange === 'custom' && (
                  <div className="flex gap-2 animate-fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={reportDateFrom}
                        onChange={(e) => setReportDateFrom(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={reportDateTo}
                        onChange={(e) => setReportDateTo(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Recruiter Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Assigned Recruiter</label>
                  <select
                    value={reportRecruiter}
                    onChange={(e) => setReportRecruiter(e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="all">All Recruiters</option>
                    {recruiters.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Call Status Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Call Status Filter</label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    {PIPELINE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campaign project selector (Only visible if no active project is opened context) */}
                {!activeProjectId && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Project Campaign</label>
                    <select
                      value={reportProject}
                      onChange={(e) => setReportProject(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                    >
                      <option value="all">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Filtered Subset KPI Metrics Display */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-sans text-center animate-fade-in">
              {[
                { label: 'Aggregate Calls', count: repCalls, bg: 'bg-white border-slate-100 text-slate-700 font-semibold' },
                { label: 'Interested', count: repInterested, bg: 'bg-teal-50 border-teal-100 text-teal-800' },
                { label: 'Not Interested / Not Suitable', count: repRejected, bg: 'bg-rose-50 border-rose-100 text-rose-800' },
                { label: 'Follow Up', count: repFollowUp, bg: 'bg-violet-50 border-violet-100 text-violet-800' },
                { label: 'Not Suitable', count: repBench, bg: 'bg-pink-50 border-pink-100 text-pink-800' },
                { label: 'Will Attend', count: repWilling, bg: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
                { label: 'Interview/Exam Passed', count: repPassed, bg: 'bg-emerald-50 border-emerald-100 text-emerald-800 font-bold' },
                { label: 'In Processing', count: repCompleted, bg: 'bg-cyan-50 border-cyan-100 text-cyan-800' },
                { label: 'Selected/Travelled', count: repTravelled, bg: 'bg-green-50 border-green-100 text-green-800 font-extrabold' },
                { label: 'Document Submitted', count: repDocs, bg: 'bg-amber-50 border-amber-100 text-amber-800 shadow-sm' }
              ].map((c, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${c.bg}`}>
                  <p className="text-[8px] font-bold uppercase tracking-wider">{c.label}</p>
                  <h4 className="text-lg font-extrabold mt-1">{c.count}</h4>
                </div>
              ))}
            </div>

            {/* Candidacy Records matching layout list */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1 hover:text-brand-600 transition-colors font-sans">
                  Candidacy Audit Logs
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportReportToExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl shadow-md transition-all font-sans"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Export Reports to Excel
                  </button>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                    {filteredReportCandidates.length} Records found
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Candidate</th>
                      <th className="px-4 py-3.5">Phone Number</th>
                      <th className="px-4 py-3.5">Job Role</th>
                      <th className="px-4 py-3.5">Recruiter Assigned</th>
                      <th className="px-4 py-3.5">Project Campaign</th>
                      <th className="px-4 py-3.5">Call Status</th>
                      <th className="px-4 py-3.5">Last updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReportCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                          No matching records found. Refine query filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReportCandidates.map((c) => {
                        const proj = projects.find((p) => p.id === c.projectId);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors font-medium">
                            <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
                            <td className="px-4 py-3 text-slate-900 font-extrabold">{c.phone}</td>
                            <td className="px-4 py-3 text-slate-600">{c.jobRole || 'General'}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold">
                                {c.recruiterName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-semibold">{proj ? proj.name : 'Unknown project'}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full">
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-sans text-[10px]">
                              {new Date(c.lastUpdated).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Documents Submitted */}
             {activeTab === 'documents' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Summary Rows */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-brand-500 to-brand-650 rounded-2xl p-5 shadow-lg shadow-brand-500/20 text-white flex items-center justify-between col-span-2 md:col-span-1 border-0">
                <div>
                  <p className="text-[10px] font-bold text-brand-100 uppercase tracking-wider">Today's Submissions Collected</p>
                  <h3 className="text-3.5xl font-extrabold mt-1 tracking-tight">{docSummaryToday}</h3>
                  <p className="text-[10px] text-brand-200 mt-1">Documents archived today</p>
                </div>
                <div className="text-2.5xl h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center font-bold">📥</div>
              </div>

              {[
                { label: 'Total Submissions in Period', value: filteredDocs.length, indicator: '📄', bg: 'bg-white' },
                { label: 'Weekly submissions log', value: docSummaryWeek, indicator: '🗓️', bg: 'bg-white' }
              ].map((c, i) => (
                <div key={i} className={`border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between ${c.bg}`}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</h3>
                  </div>
                  <div className="h-10 w-10 text-slate-400 rounded-xl flex items-center justify-center font-bold text-lg">{c.indicator}</div>
                </div>
              ))}
            </div>

            {/* Filter controls + submissions table */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm space-y-5 p-6 font-sans">
              <div className="flex flex-wrap gap-4 items-end justify-between border-b border-slate-50 pb-4">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Date Quick Filter */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Date Quick Filter</span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
                      {(['today', 'week', 'month', 'year', 'all'] as const).map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setDocDateRange(r)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            docDateRange === r ? 'bg-brand-500 text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-brand-600'
                          }`}
                        >
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDocDateRange('custom')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          docDateRange === 'custom' ? 'bg-brand-500 text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-brand-600'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>
                  </div>

                  {docDateRange === 'custom' && (
                    <div className="flex gap-2 animate-fade-in">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">From Date</label>
                        <input
                          type="date"
                          value={docDateFrom}
                          onChange={(e) => setDocDateFrom(e.target.value)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">To Date</label>
                        <input
                          type="date"
                          value={docDateTo}
                          onChange={(e) => setDocDateTo(e.target.value)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Recruiter drop down select */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Recruiter Profile</span>
                    <select
                      value={docRecruiterFilter}
                      onChange={(e) => setDocRecruiterFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="all">👥 All Recruiters</option>
                      {recruiters.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Job Role drop down select */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Job Role</span>
                    <select
                      value={docJobRoleFilter}
                      onChange={(e) => setDocJobRoleFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="all">💼 All Job Roles</option>
                      {(() => {
                        const uniqueJobRoles = Array.from(new Set([
                          ...(activeProj?.jobRoles || []),
                          ...candidates.filter(c => c.projectId === activeProjectId && c.jobRole).map(c => c.jobRole!)
                        ])).filter(Boolean);
                        return uniqueJobRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={handleExportDocsToExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all font-sans shrink-0"
                >
                  <DownloadCloud className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>

              {/* Recruiter breakdown widgets - COMPACT FOR 50+ RECRUITERS */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  SUBMISSION CONTRIBUTED BY RECRUITER (Current Period)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {recruiters.map((r) => {
                    const subTotal = periodDocs.filter((d) => d.recruiterName === r.name).length;
                    const todaySubCount = periodDocs.filter((d) => d.recruiterName === r.name && checkInDateRange(d.date, 'today')).length;
                    
                    return (
                      <div 
                        key={r.name} 
                        className={`bg-slate-50/50 hover:bg-slate-50 border rounded-xl p-2.5 transition-all text-xs flex flex-col justify-between ${
                          docRecruiterFilter === r.name ? 'border-brand-500 ring-2 ring-brand-500/5' : 'border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10.5px] font-bold text-slate-700 truncate" title={r.name}>
                            {r.name}
                          </span>
                          <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded ${
                            subTotal > 0 ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {subTotal}
                          </span>
                        </div>
                        {todaySubCount > 0 && (
                          <div className="mt-1 flex items-center justify-between text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded animate-pulse">
                            <span>Today:</span>
                            <span>+{todaySubCount}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document table render */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 mt-4">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date Submitted</th>
                      <th className="px-4 py-3">Recruiter Profile</th>
                      <th className="px-4 py-3">Candidate name</th>
                      <th className="px-4 py-3">Phone number</th>
                      <th className="px-4 py-3">Job Role</th>
                      <th className="px-4 py-3 text-right">Submitted File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          No matching document submissions logged. Adjust filters.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((d, index) => {
                        const cand = candidates.find((c) => c.phone === d.phoneNumber || c.name === d.candidateName);
                        const jobRole = d.jobRole || cand?.jobRole || '—';
                        return (
                          <tr key={index} className="hover:bg-slate-50 font-medium">
                            <td className="px-4 py-3 text-slate-400 text-[10px]">{new Date(d.date).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                                {d.recruiterName}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{d.candidateName}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{d.phoneNumber}</td>
                            <td className="px-4 py-3 text-slate-500 font-semibold">{jobRole}</td>
                            <td className="px-4 py-3 text-right">
                              {d.documentLink ? (
                                <a
                                  href={d.documentLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center text-brand-600 font-bold hover:underline"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Open PDF
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Leads Allocator (Distribute) */}
        {/* ========================================================================= */}
        {activeTab === 'distribute' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Load Files */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-brand-500" />
                  Load Raw Leads spreadsheet
                </h3>
                <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-2xl p-6 transition-all text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 relative">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleExcelUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 text-xs">
                    <DownloadCloud className="w-10 h-10 text-brand-500 mx-auto" />
                    <p className="text-slate-600 font-semibold font-sans">
                      Drag & Drop dynamic file (XLSX, XLS, CSV) or <span className="text-brand-500 underline">Browse files</span>
                    </p>
                    <p className="text-[10px] text-slate-400">Maps headers dynamically: Name, Phone, Qualification, notes, etc.</p>
                  </div>
                </div>

                {uploadedFileName && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs">
                    <span className="font-bold text-slate-700">File: {uploadedFileName}</span>
                    <button onClick={handleRemoveSpreadsheet} className="text-rose-500 font-bold hover:underline">
                      Remove
                    </button>
                  </div>
                )}

                {/* Spreadsheet Buffer table info */}
                {rawLeads.length > 0 && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Total active leads in spreadsheet:</span>
                      <span className="font-extrabold text-slate-800 text-sm">{rawLeads.length} leads</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-40">
                      <table className="min-w-full text-[11px] text-left">
                        <thead className="bg-slate-50 font-bold text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Qualification</th>
                            <th className="px-3 py-2">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawLeads.slice(0, 5).map((l, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-bold text-slate-700">{l.name || '—'}</td>
                              <td className="px-3 py-2 text-slate-900 font-semibold">{l.phone || '—'}</td>
                              <td className="px-3 py-2 text-slate-500">{l.qualification || '—'}</td>
                              <td className="px-3 py-2 text-slate-400 truncate max-w-[120px]">{l.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Distribute allocations form block */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-slate-500" />
                  Assign and Distribute leads
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Target Project Campaign *</label>
                    <select
                      value={distProject}
                      onChange={(e) => setDistProject(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose Campaign --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Target Job Role *</label>
                    <select
                      value={distJobRole}
                      onChange={(e) => setDistJobRole(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">-- Direct/All --</option>
                      {projects
                        .find((p) => p.id === distProject)
                        ?.jobRoles?.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Allocation tallies table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Recruiter Profile</th>
                        <th className="px-4 py-2.5 text-center">Allocated Lead Count</th>
                        <th className="px-4 py-2.5 text-right">Instant allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recruiters.map((r) => (
                        <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-slate-700">{r.name}</td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={recruiterAllocCounts[r.name] || ''}
                              onChange={(e) => handleRecruiterAllocChange(r.name, e.target.value)}
                              placeholder="0"
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleAllocSpecificRecruiter(r.name)}
                              className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                            >
                              Allocate &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleDistributeAll}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  📥 Distribute buffer list to recruiters
                </button>
              </div>
            </div>

            {/* Distribution History Logs */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700">Distribution Audit Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date Distributed</th>
                      <th className="px-4 py-3">Manager Profiler</th>
                      <th className="px-4 py-3">Target Campaign Project</th>
                      <th className="px-4 py-3">Recruiter Allocated</th>
                      <th className="px-4 py-3 text-right">Allocated Lead Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {distributionLog.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                          No allocation transactions logged.
                        </td>
                      </tr>
                    ) : (
                      distributionLog.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-[10px] text-slate-400">{new Date(log.date).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{log.manager || 'Admin'}</td>
                          <td className="px-4 py-3 text-slate-600">{log.projectName}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                              {log.recruiter}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-800">{log.count} Leads</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Projects Campaign management */}
        {/* ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-fade-in text-xs font-sans">
            <div className={showCreateProjectForm ? "grid grid-cols-1 xl:grid-cols-5 gap-6" : "space-y-4"}>
              {/* Create Project Dynamic form */}
              {showCreateProjectForm ? (
                <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 h-fit">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-5 h-5 text-brand-500" />
                      Launch New Campaigns project
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateProjectForm(false)}
                      className="p-1 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={(e) => { handleCreateProjectSubmit(e); setShowCreateProjectForm(false); }} className="space-y-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="e.g. Project Tech Support – Voice"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Vacancies *</label>
                    <input
                      type="number"
                      required
                      value={projVacancies}
                      onChange={(e) => setProjVacancies(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">LocationCampaign</label>
                    <input
                      type="text"
                      value={projLocation}
                      onChange={(e) => setProjLocation(e.target.value)}
                      placeholder="e.g. Chennai, Bangalore"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Details & Context *</label>
                  <textarea
                    rows={2}
                    required
                    value={projDetails}
                    onChange={(e) => setProjDetails(e.target.value)}
                    placeholder="Provide description, target metrics, package details..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>

                {/* Job Roles dynamically added list */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Job Roles Campaigns (add multiple roles)</label>
                  <div className="space-y-1.5 scroll-container max-h-40 overflow-y-auto pr-1">
                    {projRoles.map((role, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={role}
                          onChange={(e) => handleRoleCountChange(idx, e.target.value)}
                          placeholder="e.g. Senior executive (Voice)"
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg"
                        />
                        {projRoles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRoleRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRoleRow}
                    className="mt-1.5 text-[10px] font-bold text-brand-650 hover:underline flex items-center gap-1"
                  >
                    + Add another job role row
                  </button>
                </div>

                {/* Custom target profile fields config */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Profile dynamic field configs (optional)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {customFields.map((cf, idx) => (
                      <div key={cf.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => setCustomFields((prev) => prev.filter((field) => field.id !== cf.id))}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Field label</label>
                            <input
                              type="text"
                              required
                              value={cf.label}
                              onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                              placeholder="e.g. Notice Period"
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Field type</label>
                            <select
                              value={cf.type}
                              onChange={(e) => handleCustomFieldChange(idx, 'type', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded"
                            >
                              <option value="text">Text Input</option>
                              <option value="dropdown">Dropdown</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="number">Number</option>
                              <option value="date font-sans">Date</option>
                            </select>
                          </div>
                        </div>

                        {cf.type === 'dropdown' && (
                          <div className="animate-fade-in">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Dropdown choices (Comma-separated)</label>
                            <input
                              type="text"
                              placeholder="Option A, Option B, Option C"
                              value={cf.options?.join(', ') || ''}
                              onChange={(e) =>
                                handleCustomFieldChange(
                                  idx,
                                  'options',
                                  e.target.value.split(',').map((o) => o.trim()).filter(Boolean)
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                            />
                          </div>
                        )}

                        <label className="flex items-center space-x-1.5 text-[10px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cf.required}
                            onChange={(e) => handleCustomFieldChange(idx, 'required', e.target.checked)}
                            className="h-3.5 w-3.5 text-brand-500 rounded border-slate-300"
                          />
                          <span className="text-slate-500 font-semibold select-none">Mark field as compulsory required</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomFieldBuilder}
                    className="mt-1.5 text-[10px] font-bold text-brand-650 hover:underline flex items-center gap-1"
                  >
                    + Add target dynamic profile data field
                  </button>
                </div>

                {/* Recruiter permission checklists */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Permitted recruiters assigned *</label>
                  <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-40 overflow-y-auto">
                    {recruiters.length === 0 ? (
                      <p className="text-slate-400 italic">No Recruiters enrolled. Setup employee roles first.</p>
                    ) : (
                      recruiters.map((r) => (
                        <label key={r.name} className="flex items-center space-x-2.5 cursor-pointer font-semibold bg-white p-1.5 rounded-lg border border-slate-100/50">
                          <input
                            type="checkbox"
                            checked={projRecruiters.includes(r.name)}
                            onChange={(e) => handleRecruiterCheckChange(r.name, e.target.checked)}
                            className="h-4 w-4 rounded text-brand-500 border-slate-300"
                          />
                          <span className="text-slate-700">{r.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:bg-brand-600"
                >
                  Create and Launch project
                </button>
              </form>
            </div>
              ) : null}

              {/* List existing Project logs inside custom box-type grid */}
              <div className={showCreateProjectForm ? "xl:col-span-3 space-y-4" : "w-full space-y-4"}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans">Active Recruitment Campaigns</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateProjectForm(!showCreateProjectForm)}
                      className={`p-1.5 text-white rounded-full transition-all flex items-center justify-center font-bold font-sans ${
                        showCreateProjectForm 
                          ? 'bg-rose-500 hover:bg-rose-600 hover:rotate-45 font-extrabold pb-[3px]' 
                          : 'bg-brand-500 hover:bg-brand-600 hover:scale-110 shadow-sm font-extrabold pb-[3px]'
                      }`}
                      title={showCreateProjectForm ? "Close Form" : "Create New Campaign Project"}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full font-mono">
                    {projects.length} Registered Projects
                  </span>
                </div>
                <div className={`grid grid-cols-1 gap-4 ${
                  showCreateProjectForm 
                    ? 'md:grid-cols-2' 
                    : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {projects.map((p) => {
                  const projectCandidates = candidates.filter((c) => c.projectId === p.id);
                  let statusBadge = '';
                  if (p.status === 'Active') {
                    statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  } else if (p.status === 'Completed') {
                    statusBadge = 'bg-sky-50 text-sky-700 border-sky-100';
                  } else if (p.status === 'Stopped') {
                    statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else {
                    statusBadge = 'bg-rose-50 text-rose-700 border-rose-100';
                  }

                  const isActiveOpen = activeProjectId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                        isActiveOpen ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] uppercase font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full select-none">
                            📍 {p.location || 'Kuwait MOH Office'}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold border text-[9px] select-none ${statusBadge}`}>
                            {p.status || 'Active'}
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-extrabold text-slate-800 mt-3 font-sans">
                          {p.name}
                        </h4>
                        
                        <p className="text-[11px] text-slate-400 mt-1 pb-2 leading-relaxed truncate-3-lines line-clamp-2">
                          {p.details || 'No active campaign description provided.'}
                        </p>

                        <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-50 text-[11px] text-slate-600 font-semibold font-sans">
                          <div className="flex justify-between">
                            <span className="text-slate-400">📊 Allocated Candidates:</span>
                            <span className="font-bold text-slate-700">{projectCandidates.length} applicants</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">👥 Open Vacancies:</span>
                            <span className="font-bold text-slate-700">{p.openings || 0} openings</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">🏷️ Active Job Roles:</span>
                            <span className="font-extrabold text-brand-600 truncate max-w-[150px]" title={p.jobRoles?.join(', ')}>
                              {p.jobRoles?.join(', ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-50 flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(p.id);
                            setActiveTab('dashboard');
                            showToast('Workspace Switched', `Active workspace switched context specifically to project: ${p.name}.`, 'success');
                          }}
                          className={`flex-1 py-1.5 text-center font-bold text-[11px] rounded-xl transition-all ${
                            isActiveOpen
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default font-extrabold'
                              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/10'
                          }`}
                        >
                          {isActiveOpen ? '✓ Currently Open' : '📂 Open Workspace'}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Project Configuration"
                            className="p-2 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-150 rounded-xl transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProject(p.id)}
                            title="Delete Recruitment Project"
                            className="p-2 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 border border-rose-150 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Employees configuration */}
        {/* ========================================================================= */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-fade-in text-xs">
            {/* Add Employee widget form */}
            <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-brand-500" />
                Add New Staff recruiter
              </h3>
              <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
                <div>
                  <label className="font-bold text-slate-650 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Anandha Selvan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-650 block mb-1">Designation role *</label>
                  <select
                    value={empDesignation}
                    required
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Choose dynamic role --</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Senior Recruiter">Senior Recruiter</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="MD">MD</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-650 block mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    placeholder="e.g. anand (lowercase, no spaces)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-650 block mb-1">Login Password *</label>
                  <input
                    type="text"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder="Secure alphanumeric passphrase"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:bg-brand-600"
                >
                  Create & Enroll staff
                </button>
              </form>
            </div>

            {/* List Employees */}
            <div className="xl:col-span-3 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700">Enrolled Staff Roster</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-[11px] text-left">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[9px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Designation role</th>
                      <th className="px-4 py-3">Login Username</th>
                      <th className="px-4 py-3 text-right font-mono">Enrolled password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {employees.map((em) => (
                      <tr key={em.username} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{em.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${em.designation === 'Manager' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {em.designation}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">{em.username}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400 select-all font-semibold">
                          {em.password || '●●●●●●'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Talent Bench */}
        {/* ========================================================================= */}
        {activeTab === 'bench' && (
          <div className="space-y-6 animate-fade-in text-xs">
            {/* Summary counters in flex bento */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(() => {
                const dynamicCards = [
                  { label: 'Total talent bench size', value: futureBench.length, theme: 'bg-white border border-slate-100' }
                ];
                topBenchCategories.forEach((item, index) => {
                  const themes = [
                    'bg-violet-50 text-violet-800 border border-violet-100',
                    'bg-teal-50 text-teal-800 border border-teal-100',
                    'bg-amber-50 text-amber-800 border border-amber-100'
                  ];
                  dynamicCards.push({
                    label: `${item.category} Pool`,
                    value: item.count,
                    theme: themes[index % themes.length]
                  });
                });
                while (dynamicCards.length < 4) {
                  dynamicCards.push({
                    label: `Future Category Spot ${dynamicCards.length + 1}`,
                    value: 0,
                    theme: 'bg-slate-50/50 text-slate-400 border border-slate-100/50 border-dashed italic'
                  });
                }
                return dynamicCards;
              })().map((c, i) => (
                <div key={i} className={`p-4 rounded-2xl shadow-sm text-center font-sans ${c.theme}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-85">{c.label}</p>
                  <h3 className="text-2xl font-extrabold mt-1">{c.value}</h3>
                </div>
              ))}
            </div>

            {/* Filters row bar */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-wrap gap-3 items-end">
              <div className="flex-grow min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Dynamic text query lookup</label>
                <div className="relative">
                  <input
                    type="text"
                    value={benchSearch}
                    onChange={(e) => setBenchSearch(e.target.value)}
                    placeholder="Search candidate name, phone, qualifications..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-450" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Skilled Category</label>
                <select
                  value={benchCategory}
                  onChange={(e) => setBenchCategory(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="BPO Agent">BPO Agent</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Retail Representative">Retail Representative</option>
                  <option value="Tech Support Agent">Tech Support Agent</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="HR Executive">HR Executive</option>
                  <option value="Data Entry Operator">Data Entry Operator</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Sourcing Recruiter</label>
                <select
                  value={benchRecruiter}
                  onChange={(e) => setBenchRecruiter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                >
                  <option value="all">All Recruiters</option>
                  {recruiters.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bench candidates list table */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-705 font-sans">Future Collections Bench Pool</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBenchToExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl shadow-md transition-all font-sans"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Export Bench to Excel
                  </button>
                  <span className="text-[10px] font-semibold bg-violet-50 text-violet-650 px-2.5 py-0.5 rounded-full border border-violet-100">
                    {filteredBench.length} Records in bench
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Candidate name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Qualifications</th>
                      <th className="px-4 py-3">Fit category</th>
                      <th className="px-4 py-3">Fit Remarks</th>
                      <th className="px-4 py-3">Logged recruiter</th>
                      <th className="px-4 py-3">Logged Date</th>
                      <th className="px-4 py-3">Source project campaign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBench.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                          No talent bench entries recorded match current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBench.map((b) => (
                        <tr key={b.benchId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-800">{b.name}</td>
                          <td className="px-4 py-3 text-slate-900 font-extrabold">{b.phone}</td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{b.qualification || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] bg-violet-50 text-violet-750 px-2 py-0.5 rounded-full border border-violet-100 font-bold">
                              {b.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={b.remarks}>
                            {b.remarks}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-bold">{b.recruiterName}</td>
                          <td className="px-4 py-3 text-slate-400 text-[10px] font-sans">{new Date(b.dateTagged).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-slate-500">{b.sourceProjectName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB Panel: Settings synchronisation URL */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6 animate-fade-in text-xs font-sans">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                ⚙️ Dynamic Google Sheets Synch synchronisation API Connection
              </h3>
              <p className="text-slate-500 leading-relaxed font-sans mt-1">
                Establish dual remote sync directly into your Google Sheets workspace via a Google Apps Script Web App. 
                Enter your deployed Web App script URL below to synchronize employee metrics and candidate profiles in real-time.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Deployed Apps Script Web API URL Link</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/…/exec"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={testStatus === 'testing'}
                  onClick={handleSaveApiUrl}
                  className="px-4 py-2.5 bg-brand-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {testStatus === 'testing' ? 'Testing Link...' : 'Save & Verify active connection'}
                </button>
              </div>

              {testStatus !== 'idle' && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold animate-fade-in font-mono ${
                    testStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      : testStatus === 'testing'
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-rose-50 text-rose-800 border-rose-100'
                  }`}
                >
                  {testStatus === 'testing' && '⏳ Querying Google script endpoint, checking permissions...'}
                  {testStatus === 'success' && testResponseText}
                  {testStatus === 'failure' && testResponseText}
                </div>
              )}
            </div>

            {/* Google Drive CV Storage Target Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                📁 Google Drive CV Storage Folder
              </h3>
              <p className="text-slate-500 leading-relaxed mt-1">
                Configure the specific Google Drive target folder where CVs and candidate documents are uploaded and accessed.
              </p>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">CV Folder Google Drive ID</label>
                <input
                  type="text"
                  placeholder="Insert custom folder ID"
                  value={cvFolderId}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (setCvFolderId) {
                      setCvFolderId(val);
                      localStorage.setItem('recruitment_mis_cv_folder_id', val);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Target folder link is currently configured as:{' '}
                  <a
                    href={`https://drive.google.com/drive/folders/${cvFolderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-500 underline font-semibold"
                  >
                    https://drive.google.com/drive/folders/{cvFolderId}
                  </a>
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2 mt-4 text-blue-900">
                <h4 className="text-xs font-extrabold flex items-center gap-1">💡 Google Apps Script Update Guide</h4>
                <p className="text-[10.5px] leading-relaxed">
                  To ensure candidate resume files are successfully uploaded directly to this folder, verify that your Google Apps Script's <strong>doPost</strong> handles the base64 file buffer correctly. You can copy-paste this direct Google Apps Script handler snippet into your Sheets Script Editor:
                </p>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] overflow-x-auto select-all leading-normal">
{[
  '// 1. Paste this block within your Google Apps Script web app',
  'function doPost(e) {',
  '  try {',
  '    var data = JSON.parse(e.postData.contents);',
  '    if (data.action === "uploadDocument") {',
  '      // Respect dynamic folder id from recruiter client',
  `      var folderId = data.cvFolderId || "${cvFolderId}";`,
  '      var folder = DriveApp.getFolderById(folderId);',
  '      ',
  '      // Decodes base64 file data',
  '      var decodedBytes = Utilities.base64Decode(data.fileBase64.split(",")[1] || data.fileBase64);',
  '      var blob = Utilities.newBlob(decodedBytes, data.fileType, data.fileName);',
  '      var file = folder.createFile(blob);',
  '      ',
  '      // Enables anyone with link to view CV',
  '      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);',
  '      ',
  '      return ContentService.createTextOutput(JSON.stringify({',
  '        success: true,',
  '        documentLink: file.getUrl()',
  '      })).setMimeType(ContentService.MimeType.JSON);',
  '    }',
  '    // ... rest of sheet handlers',
  '  } catch(err) {',
  '    return ContentService.createTextOutput(JSON.stringify({',
  '      success: false,',
  '      error: err.toString()',
  '    })).setMimeType(ContentService.MimeType.JSON);',
  '  }',
  '}'
].join('\n')}
                </pre>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-[11px] leading-relaxed text-amber-800 font-semibold space-y-1">
              <h4 className="text-xs font-extrabold block mb-1">Spreadsheet Architecture Bootstrap</h4>
              <p>On initial connection, candidate sync channels bootstrap the following structural Sheets automatically:</p>
              <p>1. <strong>Employee Details</strong> (Login rosters and credential limits)</p>
              <p>2. <strong>Projects</strong> (Campaign details, custom field criteria)</p>
              <p>3. <strong>Data Pool</strong> (Aggregate Master Candidacy database)</p>
              <p>4. <strong>Future Bench</strong> (Category-bound global bench pool)</p>
              <p>5. <strong>Distribution Log</strong> (Manager tracking audits and listings)</p>
            </div>
          </div>
        )}
      </>
    </div>

      {/* ========================================================================= */}
      {/* Edit campaign Project modal form */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm shadow-inner" onClick={() => setIsEditModalOpen(false)} />
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in text-xs font-semibold">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-500 to-brand-650 rounded-t-3xl text-white">
              <div>
                <h3 className="text-base font-extrabold">✏️ Edit Campaign Campaign Project</h3>
                <p className="text-[10px] text-brand-100 mt-1">Review parameters, Job Roles, and allotted recruiters</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto px-6 py-5">
              <form onSubmit={handleSaveEditSubmit} className="space-y-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Location</label>
                    <input
                      type="text"
                      value={editProjLocation}
                      onChange={(e) => setEditProjLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Vacancies</label>
                    <input
                      type="number"
                      value={editProjVacancies}
                      onChange={(e) => setEditProjVacancies(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Campaign Details</label>
                  <textarea
                    rows={2}
                    value={editProjDetails}
                    onChange={(e) => setEditProjDetails(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Job Roles</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {editProjRoles.map((role, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={role}
                          onChange={(e) => handleEditRoleCountChange(idx, e.target.value)}
                          className="flex-1 px-3 py-1 text-xs border border-slate-200 rounded-lg text-slate-800"
                        />
                        {editProjRoles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleEditRoleRowRemove(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleEditRoleRowAdd}
                    className="mt-1 text-[10px] font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                  >
                    + Add Job Role row
                  </button>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Allocated Recruiters *</label>
                  <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-40 overflow-y-auto">
                    {recruiters.map((r) => (
                      <label key={r.name} className="flex items-center space-x-2.5 cursor-pointer hover:bg-white p-1.5 rounded transition-colors border border-slate-100">
                        <input
                          type="checkbox"
                          checked={editProjRecruiters.includes(r.name)}
                          onChange={(e) => handleEditRecruiterCheckChange(r.name, e.target.checked)}
                          className="h-4 w-4 rounded text-brand-500 border-slate-300"
                        />
                        <span className="text-slate-700">{r.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Campaign Status</label>
                  <select
                    value={editProjStatus}
                    onChange={(e) => setEditProjStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
                  >
                    <option value="Active">● Active campaign</option>
                    <option value="Completed">✔ Completed Campaign</option>
                    <option value="Stopped">⏸ Stopped campaign</option>
                    <option value="Deleted">✕ Deleted archive</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:bg-brand-600 mt-2 active:scale-[0.98]"
                >
                  💾 Save campaign modifications
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
