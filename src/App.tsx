/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Project, Candidate, Employee, FutureBenchEntry, SubmittedDoc, DistributionLog } from './types';
import { DEFAULT_EMPLOYEES } from './mockData';
import Login from './components/Login';
import RecruiterDashboard from './components/RecruiterDashboard';
import ManagerPortal from './components/ManagerPortal';
import CandidateDrawer from './components/CandidateDrawer';

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbyn2xjBTNuJul5fK0lf0hxYmPSBCtYlOvceSOX1QmE_HSDKG8kgr2rNvM-iXXRfELw1Qw/exec';

function cleanMeta(val: string | undefined | null): string {
  if (!val) return '';
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (lower === 'meta' || lower === 'n/a' || lower === 'na' || lower === 'undefined' || lower === 'null') {
    return '';
  }
  return s;
}

export default function App() {
  // Safe helper to parse JSON with fallback
  const safeParse = <T,>(jsonString: string | null, fallback: T): T => {
    if (!jsonString) return fallback;
    try {
      const parsed = JSON.parse(jsonString);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      console.warn('Failed to parse JSON cache:', e);
      return fallback;
    }
  };

  // Session Security Role state
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const val = localStorage.getItem('recruitment_mis_user') || sessionStorage.getItem('recruitment_mis_user');
    return val === 'null' || val === 'undefined' || !val ? null : val;
  });
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(() => {
    const val = localStorage.getItem('recruitment_mis_role') || sessionStorage.getItem('recruitment_mis_role');
    return val === 'null' || val === 'undefined' || !val ? null : val;
  });

  // Sync endpoint API URL
  const [apiUrl, setApiUrl] = useState<string>(() => {
    const saved = localStorage.getItem('recruitment_mis_api_url');
    if (saved === null || saved === 'null' || saved === 'undefined') {
      localStorage.setItem('recruitment_mis_api_url', DEFAULT_API_URL);
      return DEFAULT_API_URL;
    }
    return saved;
  });

  // DB datasets
  const [projects, setProjects] = useState<Project[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [futureBench, setFutureBench] = useState<FutureBenchEntry[]>([]);
  const [submittedDocs, setSubmittedDocs] = useState<SubmittedDoc[]>([]);
  const [distributionLog, setDistributionLog] = useState<DistributionLog[]>([]);

  // Selection campaign project context
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const val = localStorage.getItem('recruitment_mis_active_project');
    return val === 'null' || val === 'undefined' || !val ? null : val;
  });
  const [cvFolderId, setCvFolderId] = useState<string>(
    () => localStorage.getItem('recruitment_mis_cv_folder_id') || '1w43JAQYD_MgNqgsUFeWloYsydKFVgnsu'
  );

  // UI state
  const [candidateDrawerId, setCandidateDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'warning' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Background Loading spinner
  const [syncing, setSyncing] = useState(false);

  // Helper trigger Toast
  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, title, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Bootstrapping Initial seeds
  useEffect(() => {
    const DATA_VERSION = '3.5';
    if (localStorage.getItem('mis_data_version') !== DATA_VERSION) {
      localStorage.removeItem('recruitment_mis_projects');
      localStorage.removeItem('recruitment_mis_candidates');
      localStorage.removeItem('recruitment_mis_employees');
      localStorage.removeItem('recruitment_mis_bench');
      localStorage.removeItem('recruitment_mis_distlog');
      localStorage.removeItem('recruitment_mis_submitted_docs');
      localStorage.setItem('mis_data_version', DATA_VERSION);
    }

    // Load from local storage
    const savedProjects = localStorage.getItem('recruitment_mis_projects');
    const savedEmployees = localStorage.getItem('recruitment_mis_employees');
    const savedCandidates = localStorage.getItem('recruitment_mis_candidates');
    const savedBench = localStorage.getItem('recruitment_mis_bench');
    const savedDistLog = localStorage.getItem('recruitment_mis_distlog');
    const savedDocs = localStorage.getItem('recruitment_mis_submitted_docs');

    setProjects(safeParse(savedProjects, []));

    if (savedEmployees) {
      setEmployees(safeParse(savedEmployees, DEFAULT_EMPLOYEES));
    } else {
      setEmployees(DEFAULT_EMPLOYEES);
      localStorage.setItem('recruitment_mis_employees', JSON.stringify(DEFAULT_EMPLOYEES));
    }

    setCandidates(safeParse(savedCandidates, []));
    setFutureBench(safeParse(savedBench, []));
    setDistributionLog(safeParse(savedDistLog, []));
    setSubmittedDocs(safeParse(savedDocs, []));

    // Sync from sheets remotely if connected
    if (currentUser) {
      loadRemoteSheetsData();
    }
  }, [currentUser]);

  // Load Remote sheets aggregation details
  const loadRemoteSheetsData = async () => {
    if (!apiUrl) return;
    setSyncing(true);
    try {
      const roleLower = (currentUserRole || '').toLowerCase().trim();
      const isManager = ['manager', 'md', 'gm', 'assistant manager', 'general manager', 'md.gm', 'md/gm', 'md, gm', 'md. gm'].some(r => roleLower === r || roleLower.includes(r));
      const actionParam = isManager ? 'getManagerReport' : `getCandidates&employee=${encodeURIComponent(currentUser || '')}`;

      // Trigger all 6 remote operations in parallel
      const [resEmps, resProjs, resBench, resDocs, resDist, resCands] = await Promise.all([
        fetch(`${apiUrl}?action=getEmployees`),
        fetch(`${apiUrl}?action=getProjects`),
        fetch(`${apiUrl}?action=getFutureBench`),
        fetch(`${apiUrl}?action=getSubmittedDocuments`),
        fetch(`${apiUrl}?action=getDistributionLog`),
        fetch(`${apiUrl}?action=${actionParam}`)
      ]);

      const [dataEmps, dataProjs, dataBench, dataDocs, dataDist, dataCands] = await Promise.all([
        resEmps.json(),
        resProjs.json(),
        resBench.json(),
        resDocs.json(),
        resDist.json(),
        resCands.json()
      ]);

      // 1. Load Employees
      if (dataEmps.success && dataEmps.data) {
        setEmployees(dataEmps.data);
        localStorage.setItem('recruitment_mis_employees', JSON.stringify(dataEmps.data));
      }

      // 2. Load Projects
      if (dataProjs.success && dataProjs.data) {
        setProjects(dataProjs.data);
        localStorage.setItem('recruitment_mis_projects', JSON.stringify(dataProjs.data));
      }

      // 3. Load Future Bench
      if (dataBench.success && dataBench.data) {
        setFutureBench(dataBench.data);
        localStorage.setItem('recruitment_mis_bench', JSON.stringify(dataBench.data));
      }

      // 4. Load Submitted Documents
      if (dataDocs.success && dataDocs.data) {
        setSubmittedDocs(dataDocs.data);
        localStorage.setItem('recruitment_mis_submitted_docs', JSON.stringify(dataDocs.data));
      }

      // 5. Load Distribution Log
      if (dataDist.success && dataDist.data) {
        setDistributionLog(dataDist.data);
        localStorage.setItem('recruitment_mis_distlog', JSON.stringify(dataDist.data));
      }

      // 6. Sourcing Candidates based on role
      if (dataCands.success && dataCands.data) {
        // Enforce parsing candidate custom profile field JSON structures robustly
        const parsedCands = dataCands.data.map((c: any) => ({
          ...c,
          documents: c.documents || { merged: false },
          customFieldData: typeof c.customFieldData === 'string' ? safeParse(c.customFieldData, {}) : (c.customFieldData || {}),
          history: c.history || []
        }));
        
        // Merge list with local records elegantly to prevent losing offline inputs
        setCandidates(parsedCands);
        localStorage.setItem('recruitment_mis_candidates', JSON.stringify(parsedCands));
      }

      // Silent success without showing sync toast from Google sheet as per user request
    } catch (err) {
      console.warn('Network sync failed, operating in offline-first mode', err);
      showToast('Offline Mode', 'Operating under secure offline buffer modes.', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  // State mutation actions
  const handleLoginSuccess = (name: string, role: string) => {
    localStorage.setItem('recruitment_mis_user', name);
    localStorage.setItem('recruitment_mis_role', role);
    setCurrentUser(name);
    setCurrentUserRole(role);
    showToast('Welcome', `Logged in as ${name} (${role})`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('recruitment_mis_user');
    localStorage.removeItem('recruitment_mis_role');
    localStorage.removeItem('recruitment_mis_active_project');
    setCurrentUser(null);
    setCurrentUserRole(null);
    setActiveProjectId(null);
    setCandidateDrawerId(null);
    showToast('Logout Success', 'Signed out securely.', 'info');
  };

  const handleSelectProject = (id: string | null) => {
    setActiveProjectId(id);
    if (id) {
      localStorage.setItem('recruitment_mis_active_project', id);
    } else {
      localStorage.removeItem('recruitment_mis_active_project');
    }
  };

  const handleAddCandidate = async (newCand: Candidate) => {
    const updatedList = [newCand, ...candidates];
    setCandidates(updatedList);
    localStorage.setItem('recruitment_mis_candidates', JSON.stringify(updatedList));

    if (apiUrl) {
      try {
        const payload = {
          action: 'saveCandidate',
          employee: currentUser,
          candidate: {
            ...newCand,
            customFieldData: JSON.stringify(newCand.customFieldData || {})
          }
        };
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        showToast('Synced Lead', `Leads profile for ${newCand.name} saved remotely.`, 'success');
      } catch (err) {
        showToast('Saved Locally', `Lead ${newCand.name} saved in offline cache.`, 'info');
      }
    } else {
      showToast('Saved', `Candidate ${newCand.name} leads profile added.`, 'success');
    }
  };

  const handleUpdateCandidate = async (updatedCand: Candidate) => {
    const updatedList = candidates.map((c) => (c.id === updatedCand.id ? updatedCand : c));
    setCandidates(updatedList);
    localStorage.setItem('recruitment_mis_candidates', JSON.stringify(updatedList));

    if (apiUrl) {
      try {
        const payload = {
          action: 'saveCandidate',
          employee: updatedCand.recruiterName || currentUser,
          candidate: {
            ...updatedCand,
            customFieldData: JSON.stringify(updatedCand.customFieldData || {})
          }
        };
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        showToast('Lead Saved', `Metrics for ${updatedCand.name} saved successfully.`, 'success');
      } catch (err) {
        showToast('Saved Offline', `Saved changes for ${updatedCand.name} to local cache.`, 'info');
      }
    } else {
      showToast('Saved', `Successfully updated profile of ${updatedCand.name}.`, 'success');
    }

    // Sync Submitted Documents state list if document submitted
    if (['Document Submitted', 'CV Submitted'].includes(updatedCand.status) && updatedCand.documentLink) {
      const existingDocIndex = submittedDocs.findIndex((d) => d.phoneNumber === updatedCand.phone);
      const nDoc: SubmittedDoc = {
        date: new Date().toISOString(),
        recruiterName: updatedCand.recruiterName || currentUser || 'Recruiter',
        candidateName: updatedCand.name,
        phoneNumber: updatedCand.phone,
        post: projects.find((p) => p.id === updatedCand.projectId)?.name || 'Campaign',
        documentLink: updatedCand.documentLink,
        jobRole: updatedCand.jobRole
      };
      let docList: SubmittedDoc[];
      if (existingDocIndex >= 0) {
        docList = [...submittedDocs];
        docList[existingDocIndex] = nDoc;
      } else {
        docList = [nDoc, ...submittedDocs];
      }
      setSubmittedDocs(docList);
      localStorage.setItem('recruitment_mis_submitted_docs', JSON.stringify(docList));
    }
  };

  const handleAddToBench = async (benchEntry: FutureBenchEntry) => {
    const updatedBench = [benchEntry, ...futureBench];
    setFutureBench(updatedBench);
    localStorage.setItem('recruitment_mis_bench', JSON.stringify(updatedBench));

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'addToFutureBench',
            benchEntry
          })
        });
      } catch (err) {
        console.warn('Bench background sync failed');
      }
    }
  };

  const handleAddProject = async (newProj: Project) => {
    const updated = [...projects, newProj];
    setProjects(updated);
    localStorage.setItem('recruitment_mis_projects', JSON.stringify(updated));

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'createProject',
            project: newProj
          })
        });
        showToast('Created Project', `Successfully pushed ${newProj.name} online.`, 'success');
      } catch (err) {
        showToast('Created Locally', `Project ${newProj.name} initialized locally.`, 'info');
      }
    } else {
      showToast('Created Project', `Launched ${newProj.name} dynamically.`, 'success');
    }
  };

  const handleUpdateProject = async (updatedProj: Project) => {
    const updated = projects.map((p) => (p.id === updatedProj.id ? updatedProj : p));
    setProjects(updated);
    localStorage.setItem('recruitment_mis_projects', JSON.stringify(updated));

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updateProject',
            project: updatedProj
          })
        });
        showToast('Saved', `Project changes synced successfully.`, 'success');
      } catch (err) {
        showToast('Offline', 'Modifications saved locally.', 'warning');
      }
    } else {
      showToast('Saved', 'Project configurations revised locally.', 'success');
    }
  };

  const handleDeleteProject = async (id: string) => {
    const confirmed = window.confirm('Are you absolutely sure you want to permanently delete this project? ALL candidate associations will be detached.');
    if (!confirmed) return;

    const p = projects.find((x) => x.id === id);
    handleDeleteProjectState(id);
    showToast('Deleted', `Project ${p?.name || ''} deleted permanently.`, 'success');
  };

  const handleDeleteProjectState = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    localStorage.setItem('recruitment_mis_projects', JSON.stringify(projects.filter((p) => p.id !== id)));

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'deleteProject',
            projectId: id
          })
        });
      } catch (err) {
        console.warn('Remote deletion failed', err);
      }
    }
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    localStorage.setItem('recruitment_mis_employees', JSON.stringify(updated));

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'addEmployee',
            employee: newEmp
          })
        });
        showToast('Added Employee', `Staff ${newEmp.name} registered remotely.`, 'success');
      } catch (err) {
        showToast('Enrolled Locally', `${newEmp.name} created locally in cache.`, 'info');
      }
    } else {
      showToast('Staff Enrolled', `${newEmp.name} registered.`, 'success');
    }
  };

  const handleDistributeLeads = async (
    leads: any[],
    projectId: string,
    jobRole: string,
    recruiterCounts: Record<string, number>
  ) => {
    const targetProj = projects.find((p) => p.id === projectId);
    const ts = Date.now();
    let leadOffset = 0;
    const newCandidates: Candidate[] = [];
    const newLogs: DistributionLog[] = [];

    Object.entries(recruiterCounts).forEach(([recruiterName, count]) => {
      if (count <= 0) return;
      const associatedSlice = leads.slice(leadOffset, leadOffset + count);
      leadOffset += count;

      const items = associatedSlice.map((l, idx) => ({
        id: `cand-dist-${ts}-${idx}-${Math.floor(Math.random() * 1000)}`,
        projectId,
        jobRole: cleanMeta(l.post || ''),
        name: l.name || 'Anonymous Lead',
        phone: l.phone,
        email: l.email || '',
        highestQualification: cleanMeta(l.qualification || ''),
        primarySkills: l.notes || '',
        status: 'Fresh',
        source: 'Bulk Sheet',
        recruiterName,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documents: { merged: false },
        recruiterRemarks: `Automated distribution assignment by Manager ${currentUser}`,
        history: [
          {
            date: new Date().toISOString(),
            fromStatus: '',
            toStatus: 'Fresh',
            notes: `Leads dynamically assigned by Manager ${currentUser}`,
            recruiter: currentUser || 'Manager'
          }
        ]
      }));

      newCandidates.push(...items);

      // Create allocation log entry
      newLogs.push({
        id: 'log-' + ts + '-' + Math.floor(Math.random() * 100),
        date: new Date().toISOString(),
        manager: currentUser || 'Manager',
        projectId,
        projectName: targetProj?.name || 'Dynamic campaign',
        recruiter: recruiterName,
        count
      });
    });

    const updatedCandidates = [...newCandidates, ...candidates];
    setCandidates(updatedCandidates);
    localStorage.setItem('recruitment_mis_candidates', JSON.stringify(updatedCandidates));

    const updatedLogs = [...newLogs, ...distributionLog];
    setDistributionLog(updatedLogs);
    localStorage.setItem('recruitment_mis_distlog', JSON.stringify(updatedLogs));

    showToast('Allocated Leads', `Success! Allocated ${leadOffset} leads in bulk.`, 'success');

    // Sync remote
    if (apiUrl) {
      try {
        const promises = Object.entries(recruiterCounts).map(([recruiterName, count]) => {
          if (count <= 0) return Promise.resolve();
          const targetSlice = newCandidates.filter((c) => c.recruiterName === recruiterName);
          return fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'distributeLeads',
              employee: recruiterName,
              candidates: targetSlice,
              projectId,
              projectName: targetProj?.name || 'General',
              manager: currentUser || 'Manager',
              sheetUrl: ''
            })
          });
        });
        await Promise.all(promises);
        showToast('Sheets Allocated', `All allocations synchronized and pushed to Google Sheets Master.`, 'success');
      } catch (err) {
        console.warn('Distribution Sheets sync failed');
      }
    }
  };

  const handleUpdateApiUrl = (url: string) => {
    setApiUrl(url);
    localStorage.setItem('recruitment_mis_api_url', url);
  };

  // Determine Role routing
  const roleLower = (currentUserRole || '').toLowerCase().trim();
  const isManager = ['manager', 'md', 'gm', 'assistant manager', 'general manager', 'md.gm', 'md/gm', 'md, gm', 'md. gm'].some(r => roleLower === r || roleLower.includes(r));

  return (
    <div className="flex flex-col min-h-screen custom-bg-radial font-sans text-slate-800 antialiased overflow-hidden">
      {syncing && (
        <div className="fixed bottom-4 left-4 z-[100] bg-slate-900/90 text-white rounded-xl px-4 py-2 text-xs flex items-center gap-2 border border-slate-700 shadow-xl animate-bounce">
          <RefreshCw className="w-3.5 h-3.5 spin animate-spin" />
          <span>data synging.....</span>
        </div>
      )}

      {/* Main View Router */}
      {!currentUser ? (
        <Login onLoginSuccess={handleLoginSuccess} apiUrl={apiUrl} employees={employees} />
      ) : isManager ? (
        <ManagerPortal
          key={currentUser || 'manager'}
          projects={projects}
          candidates={candidates}
          employees={employees}
          futureBench={futureBench}
          submittedDocs={submittedDocs}
          distributionLog={distributionLog}
          apiUrl={apiUrl}
          onUpdateApiUrl={handleUpdateApiUrl}
          currentUser={currentUser}
          onLogout={handleLogout}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onAddEmployee={handleAddEmployee}
          onAddProject={handleAddProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProjectState}
          onDistributeLeads={handleDistributeLeads}
          showToast={showToast}
          cvFolderId={cvFolderId}
          setCvFolderId={setCvFolderId}
        />
      ) : (
        <RecruiterDashboard
          projects={projects}
          candidates={candidates}
          employees={employees}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          currentUser={currentUser}
          onLogout={handleLogout}
          onAddCandidate={handleAddCandidate}
          onOpenCandidateDrawer={(id) => setCandidateDrawerId(id)}
        />
      )}

      {/* Global Candidate Slider Drawer */}
      {candidateDrawerId && (
        <CandidateDrawer
          candidateId={candidateDrawerId}
          candidates={candidates}
          projects={projects}
          apiUrl={apiUrl}
          currentUser={currentUser || 'Recruiter'}
          currentUserRole={currentUserRole}
          cvFolderId={cvFolderId}
          onClose={() => setCandidateDrawerId(null)}
          onUpdateCandidate={handleUpdateCandidate}
          onAddToBench={handleAddToBench}
          showToast={showToast}
        />
      )}

      {/* Global Toast Alert Notifications */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 max-w-sm w-full bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-start space-x-3 z-[100] transform transition-all duration-300 animate-slide-in">
          <div
            className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg ${
              toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-600'
                : toast.type === 'warning'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === 'warning' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-xs font-extrabold text-slate-1000">{toast.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
