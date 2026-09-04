/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee } from './types';

export const DEFAULT_EMPLOYEES: Employee[] = [
  { name: 'Prebin', designation: 'Recruiter', username: 'prebin', password: '111111' },
  { name: 'Mahadev', designation: 'Recruiter', username: 'mahadev', password: '222222' },
  { name: 'Gokul', designation: 'Manager', username: 'gokul', password: '111222' }
];

export const MOCK_RAW_LEADS_CSV = `Name,Phone,Qualification,Post,Notes
Amit Kumar,9876543210,B.Tech,Software Engineer,Experienced in Python
Siddharth,9123456789,MBA,Manager,Good communication skills
Rhea Sen,8887776665,B.Com,Accountant,Familiar with Tally
Pooja Patel,7776665554,12th Pass,BPO Executive,Fresh candidate
Rajesh Rao,9998887776,Diploma,Technician,Available immediately`;

export const PIPELINE_STATUSES = [
  'Fresh',
  'Interested',
  'Not Interested',
  'Follow up',
  'Not Suitable',
  'Call Not Connected',
  'Willing to Attend Interview',
  'CV Submitted',
  'Document Submitted',
  'Interview Passed',
  'Exam Passed',
  'Selected',
  'In Processing',
  'Travelled'
];
