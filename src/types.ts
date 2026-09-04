/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'dropdown' | 'checkbox' | 'number' | 'date';
  required: boolean;
  options?: string[];
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  openings?: number;
  details?: string;
  jobRoles: string[];
  customFields?: CustomField[];
  assignedRecruiters: string[];
  createdBy?: string;
  createdDate?: string;
  status?: 'Active' | 'Completed' | 'Stopped' | 'Deleted';
}

export interface HistoryEntry {
  date: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  recruiter: string;
}

export interface Candidate {
  id: string;
  projectId: string;
  jobRole: string;
  name: string;
  phone: string;
  email?: string;
  age?: string;
  gender?: string;
  yearsOfExperience?: string;
  currentJob?: string;
  highestQualification?: string;
  primarySkills?: string;
  status: string;
  source: string;
  callbackTime?: string;
  documents?: {
    resume?: boolean;
    idProof?: boolean;
    educationalCertificates?: boolean;
    merged?: boolean;
  };
  customFieldData?: Record<string, any>;
  recruiterRemarks?: string;
  recruiterName: string;
  dateAdded: string;
  lastUpdated: string;
  documentLink?: string;
  isFutureBench?: boolean;
  futureCategory?: string;
  futureRemarks?: string;
  history?: HistoryEntry[];
}

export interface FutureBenchEntry {
  benchId: string;
  candidateId: string;
  name: string;
  phone: string;
  qualification?: string;
  category: string;
  coreQualification?: string;
  skills?: string;
  remarks: string;
  recruiterName: string;
  dateTagged: string;
  sourceProjectId: string;
  sourceProjectName: string;
}

export interface SubmittedDoc {
  date: string;
  recruiterName: string;
  candidateName: string;
  phoneNumber: string;
  post: string;
  documentLink: string;
  jobRole?: string;
}

export interface DistributionLog {
  logId?: string;
  id: string;
  date: string;
  manager: string;
  projectId: string;
  projectName: string;
  recruiter: string;
  count: number;
}

export interface Employee {
  name: string;
  designation: string;
  username: string;
  password?: string;
}
