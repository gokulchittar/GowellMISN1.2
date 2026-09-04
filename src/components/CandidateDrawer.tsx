/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, UploadCloud, Plus, History, Briefcase, Eye, Clock, Check } from 'lucide-react';
import { Candidate, Project, CustomField, FutureBenchEntry } from '../types';
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

interface CandidateDrawerProps {
  candidateId: string | null;
  candidates: Candidate[];
  projects: Project[];
  apiUrl: string;
  currentUser: string;
  currentUserRole?: string | null;
  cvFolderId?: string;
  onClose: () => void;
  onUpdateCandidate: (updatedCandidate: Candidate) => void;
  onAddToBench: (benchEntry: FutureBenchEntry) => void;
  showToast: (title: string, msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export default function CandidateDrawer({
  candidateId,
  candidates,
  projects,
  apiUrl,
  currentUser,
  currentUserRole,
  cvFolderId,
  onClose,
  onUpdateCandidate,
  onAddToBench,
  showToast
}: CandidateDrawerProps) {
  const candidate = candidates.find((c) => c.id === candidateId);
  const project = candidate ? projects.find((p) => p.id === candidate.projectId) : null;

  // Edit fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [experience, setExperience] = useState('');
  const [currentJob, setCurrentJob] = useState('');
  const [qualification, setQualification] = useState('');
  const [skills, setSkills] = useState('');
  const [status, setStatus] = useState('Fresh');
  const [callbackTime, setCallbackTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [docsMerged, setDocsMerged] = useState(false);
  const [docLink, setDocLink] = useState('');
  const [uploading, setUploading] = useState(false);

  // Future Bench fields
  const [futureCategory, setFutureCategory] = useState('');
  const [futureRemarks, setFutureRemarks] = useState('');

  // Dynamic Custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll back to the top on loading a new candidate
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [candidateId]);

  // Security Shield: block copying and screenshot attempts for recruiters
  useEffect(() => {
    const roleLower = (currentUserRole || '').toLowerCase().trim();
    const isRecruiter = !['manager', 'md', 'gm', 'assistant manager', 'general manager', 'md.gm', 'md/gm', 'md, gm', 'md. gm'].some(r => roleLower === r || roleLower.includes(r));
    if (!isRecruiter) return;

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("⚠️ SECURITY COMPLIANCE WARNING: Copying lead contacts or profile remarks is strictly prohibited for Recruiter accounts.");
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
        alert("⚠️ SECURITY EXCEPTION: Standard shortcuts (Copy, Screenshot, Print) are restricted inside dynamic call profiles.");
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
  }, [currentUserRole]);

  useEffect(() => {
    if (candidate) {
      setName(candidate.name || '');
      setPhone(candidate.phone || '');
      setEmail(candidate.email || '');
      setAge(candidate.age || '');
      setGender(candidate.gender || '');
      setExperience(candidate.yearsOfExperience || '');
      setCurrentJob(cleanMeta(candidate.currentJob || candidate.jobRole || ''));
      setQualification(cleanMeta(candidate.highestQualification || ''));
      setSkills(candidate.primarySkills || '');
      setStatus(candidate.status || 'Fresh');
      setCallbackTime(candidate.callbackTime || '');
      setRemarks('');
      setDocsMerged(candidate.documents?.merged || false);
      setDocLink(candidate.documentLink || '');
      setFutureCategory(candidate.futureCategory || '');
      setFutureRemarks(candidate.futureRemarks || '');
      setCustomFieldValues(candidate.customFieldData || {});
    }
  }, [candidate, candidateId]);

  if (!candidate) return null;

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Error', 'Please select a PDF file.', 'warning');
      return;
    }

    setUploading(true);
    showToast('Uploading', 'Encoding and uploading PDF...', 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (apiUrl) {
        try {
          const payload = {
            action: 'uploadDocument',
            recruiterName: currentUser,
            candidateName: name,
            phone: phone,
            post: project?.name || 'Recruitment',
            fileName: file.name,
            fileType: file.type,
            fileBase64: base64,
            cvFolderId: cvFolderId
          };
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (result.success && result.documentLink) {
            setDocLink(result.documentLink);
            showToast('Uploaded', 'Document saved to Google Drive.', 'success');
          } else {
            showToast('Error', result.error || 'Upload failed.', 'warning');
          }
        } catch (err) {
          showToast('Error', 'Remote upload failed. Check connection.', 'warning');
        } finally {
          setUploading(false);
        }
      } else {
        // Simulated upload (Local Mode)
        setTimeout(() => {
          const mockLink = `https://drive.google.com/file/d/mock-${Date.now()}/view`;
          setDocLink(mockLink);
          setUploading(false);
          showToast('Local Simulated', 'Document upload simulated.', 'info');
        }, 1500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'Follow up' && !callbackTime) {
      showToast('Required', 'Please set a callback date/time.', 'warning');
      return;
    }

    if (status === 'Interested' && project && project.jobRoles && project.jobRoles.length > 0 && !currentJob) {
      showToast('Required', 'Please select an assigned vacant job role for this project campaign.', 'warning');
      return;
    }

    if (status === 'Not Suitable' && (!futureCategory || !futureRemarks)) {
      showToast('Required', 'Please enter a skilled category and remarks for the Future Bench.', 'warning');
      return;
    }

    const updatedCandidate: Candidate = {
      ...candidate,
      name,
      phone,
      email,
      age,
      gender,
      yearsOfExperience: experience,
      currentJob,
      jobRole: currentJob || candidate.jobRole,
      highestQualification: qualification,
      primarySkills: skills,
      status,
      callbackTime: status === 'Follow up' ? callbackTime : '',
      documents: {
        ...candidate.documents,
        merged: status === 'Document Submitted' ? docsMerged : false
      },
      documentLink: docLink,
      futureCategory: status === 'Not Suitable' ? futureCategory : '',
      futureRemarks: status === 'Not Suitable' ? futureRemarks : '',
      customFieldData: customFieldValues,
      lastUpdated: new Date().toISOString(),
      recruiterRemarks: remarks || candidate.recruiterRemarks || ''
    };

    // Append to history
    if (!updatedCandidate.history) updatedCandidate.history = [];
    updatedCandidate.history.push({
      date: new Date().toISOString(),
      fromStatus: candidate.status,
      toStatus: status,
      notes: remarks || 'Updated Candidate Card',
      recruiter: currentUser
    });

    // If Not Suitable, create global bench record
    if (status === 'Not Suitable') {
      const benchEntry: FutureBenchEntry = {
        benchId: 'bench-' + Date.now(),
        candidateId: candidate.id,
        name,
        phone,
        qualification: qualification,
        category: futureCategory,
        remarks: futureRemarks,
        recruiterName: currentUser,
        dateTagged: new Date().toISOString(),
        sourceProjectId: candidate.projectId,
        sourceProjectName: project?.name || 'Unknown Project'
      };
      onAddToBench(benchEntry);
    }

    onUpdateCandidate(updatedCandidate);
    onClose();
  };

  return (
    <>
      {/* Drawer Overlay */}
      <div className="fixed inset-0 glass-overlay z-40 transition-opacity" onClick={onClose} />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl drawer-shadow z-50 transform transition-transform duration-300 ease-in-out flex flex-col animate-slide-in">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div className="flex-1 min-w-0 pr-3">
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Candidate Profiling Card
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-extrabold text-slate-800 mt-1.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none w-full px-1 rounded transition-all font-sans"
              placeholder="Candidate Name"
            />
            {project && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full mt-1.5 inline-block">
                Project: {project.name} {candidate.jobRole ? `— ${candidate.jobRole}` : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex-shrink-0"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className={`flex-grow overflow-y-auto px-6 py-6 space-y-6 ${
            (() => {
              const rL = (currentUserRole || '').toLowerCase().trim();
              const isRec = !['manager', 'md', 'gm', 'assistant manager', 'general manager', 'md.gm', 'md/gm', 'md, gm', 'md. gm'].some(r => rL === r || rL.includes(r));
              return isRec ? 'select-none' : '';
            })()
          }`}
        >
          <form onSubmit={handleSaveSubmit} className="space-y-6">
            {/* Status Update section */}
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Update Pipeline Status
              </h4>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Call Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-700"
                >
                  {PIPELINE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Callback Picker */}
              {status === 'Follow up' && (
                <div className="animate-fade-in bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Callback Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={callbackTime}
                    required
                    onChange={(e) => setCallbackTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}

              {/* Conditional Vacant Job Role Dropdown for Interested status */}
              {status === 'Interested' && project && project.jobRoles && project.jobRoles.length > 0 && (
                <div className="animate-fade-in bg-teal-50/50 border border-teal-100 p-4 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-teal-800 flex items-center gap-1.5 font-sans">
                    <Briefcase className="w-4 h-4 text-teal-600" />
                    Assign Vacant Job/Role *
                  </label>
                  <select
                    value={currentJob}
                    required
                    onChange={(e) => {
                      const sel = e.target.value;
                      setCurrentJob(sel);
                    }}
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                  >
                    <option value="">-- Choose Vacant Job Role --</option>
                    {project.jobRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-teal-650 font-bold leading-normal">
                    Selecting a vacant role considers this as their active Job/Role for client campaign processing.
                  </p>
                </div>
              )}

              {/* Conditional Document Merge Switch */}
              {status === 'Document Submitted' && (
                <div className="animate-fade-in bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Document Checksheets
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsMerged}
                      onChange={(e) => setDocsMerged(e.target.checked)}
                      className="h-4.5 w-4.5 text-brand-500 rounded border-slate-300 mt-0.5"
                    />
                    <span className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Merged files ready? (Check to trigger file attachment options)
                    </span>
                  </label>
                </div>
              )}

              {/* Document File Uploader Box */}
              {status === 'Document Submitted' && docsMerged && (
                <div className="animate-fade-in bg-brand-50/50 border border-brand-100 p-4 rounded-2xl space-y-3 shadow-inner">
                  <p className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
                    <UploadCloud className="w-4.5 h-4.5 text-brand-600" />
                    Upload Candidate PDF Dossier
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200"
                  />
                  {uploading && (
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 animate-pulse">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Uploading folder package...</span>
                    </div>
                  )}
                  {docLink && (
                    <div className="pt-2">
                       <a
                         href={docLink}
                         target="_blank"
                         rel="noreferrer"
                         className="inline-flex items-center text-xs font-semibold text-brand-600 hover:underline hover:text-brand-700"
                       >
                         <Eye className="w-4 h-4 mr-1.5" />
                         View Uploaded PDF Dossier &rarr;
                       </a>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Future Bench Tagging */}
              {status === 'Not Suitable' && (
                <div className="animate-fade-in bg-rose-50/50 border border-rose-100 p-4 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-rose-600" />
                    Tag to global Future Bench pool
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-rose-700 block mb-1">Skilled Area / Category *</label>
                    <input
                      type="text"
                      value={futureCategory}
                      required
                      onChange={(e) => setFutureCategory(e.target.value)}
                      placeholder="e.g. Retail Representative, Sales Executive"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-rose-700 block mb-1">Bench Remarks / Fitment *</label>
                    <textarea
                      value={futureRemarks}
                      required
                      onChange={(e) => setFutureRemarks(e.target.value)}
                      placeholder="Why is the candidate placed on the bench? Key skills, CTC expectations, etc."
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Project Data Custom Fields */}
              {project && project.customFields && project.customFields.length > 0 && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Spec Metric Fields</h4>
                  <div className="space-y-3">
                    {project.customFields.map((field) => {
                      const value = customFieldValues[field.id] !== undefined ? customFieldValues[field.id] : '';
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          {field.type === 'dropdown' ? (
                            <select
                              value={value}
                              required={field.required}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                            >
                              <option value="">-- Choose option --</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center space-x-2.5">
                              <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                                className="h-4 w-4 rounded text-brand-500"
                              />
                              <span className="text-xs text-slate-600 font-medium">{field.label}</span>
                            </label>
                          ) : (
                            <input
                              type={field.type}
                              value={value}
                              required={field.required}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              placeholder={`Enter ${field.label}`}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Profile Data fields */}
            <section className="space-y-4 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-400" />
                Profile Demographics
              </h4>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[11px] font-sans text-slate-600 font-medium leading-relaxed">
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Years of Experience</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-0.5">Current Job / Role</label>
                  <input
                    type="text"
                    value={currentJob}
                    onChange={(e) => setCurrentJob(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 font-bold block mb-0.5">Qualification Level</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 font-block block mb-0.5">Skilled Area / Core Competence</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-800 font-semibold"
                  />
                </div>
              </div>
            </section>

            {/* Recruiter Remarks */}
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Recruiter Dynamic Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Insert notes, call outcomes, recruiter observations..."
                  rows={2.5}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 text-xs font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/30 transition-all active:scale-[0.98]"
              >
                Save Changes to Sheets Pool
              </button>
            </section>
          </form>

          {/* Interaction History Trails */}
          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              Interaction Log Trail
            </h4>
            <div className="space-y-3 timeline-container">
              {candidate.history && candidate.history.length > 0 ? (
                [...candidate.history]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((h, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-brand-500 rounded-full mt-1.5 ring-4 ring-brand-50 flex-shrink-0" />
                        <div className="w-0.5 flex-grow bg-slate-100 mt-2" />
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-1 text-[10px]">
                          <span className="text-slate-400 font-medium">{new Date(h.date).toLocaleString()}</span>
                          <span className="font-bold bg-slate-200/85 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                            {h.notes?.toLowerCase().includes('assigned') || h.notes?.toLowerCase().includes('distribute') ? '📤 Distributed By:' : '👤 Updated By:'} {h.recruiter}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-800">
                          {h.fromStatus ? `${h.fromStatus} → ` : ''}
                          <span className="text-brand-600">{h.toStatus}</span>
                        </p>
                        {h.notes && <p className="text-slate-500 italic text-[11px] mt-1 border-l-2 border-slate-200 pl-2">"{h.notes}"</p>}
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-slate-400 italic">No historical interaction logged yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
