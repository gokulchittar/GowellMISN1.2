/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, User, Users, AlertCircle, Info } from 'lucide-react';
import { Employee } from '../types';

interface LoginProps {
  onLoginSuccess: (name: string, role: string) => void;
  apiUrl: string;
  employees: Employee[];
}

export default function Login({ onLoginSuccess, apiUrl, employees }: LoginProps) {
  const [username, setUsername] = useState(() => localStorage.getItem('login_saved_username') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('login_saved_password') || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const saveCredentialsToLocal = () => {
      localStorage.setItem('login_saved_username', username);
      localStorage.setItem('login_saved_password', password);
    };

    const performLocalLogin = (msgOnSuccess = '') => {
      const emp = employees.find(
        (x) => x.username.toLowerCase() === username.trim().toLowerCase() && String(x.password) === password
      );
      if (emp) {
        saveCredentialsToLocal();
        onLoginSuccess(emp.name, emp.designation);
        return true;
      }
      return false;
    };

    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}?action=getEmployees`);
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          const emp = json.data.find(
            (x: any) => x.username.toLowerCase() === username.trim().toLowerCase() && String(x.password) === password
          );
          if (emp) {
            saveCredentialsToLocal();
            onLoginSuccess(emp.name, emp.designation);
          } else {
            const success = performLocalLogin();
            if (!success) {
              setErrorMsg('Invalid login credentials.');
            }
          }
        } else {
          const success = performLocalLogin();
          if (!success) {
            setErrorMsg(json.error || 'Authentication failed using connected Sheets server.');
          }
        }
      } catch (err) {
        console.error('Remote auth failed, attempting local fallback', err);
        const success = performLocalLogin();
        if (!success) {
          setErrorMsg('Cannot reach authentication server or password incorrect.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      const success = performLocalLogin();
      setLoading(false);
      if (!success) {
        setErrorMsg('Invalid username or password.');
      }
    }
  };

  return (
    <div className="min-h-screen custom-bg-radial flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-white/90 backdrop-blur-md p-10 rounded-3xl border border-white/60 shadow-2xl animate-fade-in">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center mb-4">
            <img 
              src="https://res.cloudinary.com/dpnb1to3s/image/upload/v1781796016/481778660_1037742571707490_6757743138098457662_n-removebg-preview_omsd29.png" 
              alt="Gowell International" 
              className="h-28 w-auto object-contain filter drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2.5xl font-black tracking-tight text-slate-900 font-sans">Gowell International</h1>
          <p className="mt-1.5 text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50/80 border border-brand-100 px-3 py-1 rounded-full inline-block">
            Global Recruitment MIS Portal
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {errorMsg && (
            <div className="text-xs bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-xl text-center font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="text-xs font-bold text-slate-600 block mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-all"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="text-xs font-bold text-slate-600 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-all"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
