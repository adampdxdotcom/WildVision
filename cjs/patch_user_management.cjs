const fs = require('fs');
let code = fs.readFileSync('src/components/Auth/AdminConsole/UserManagementTab.tsx', 'utf8');

code = code.replace(
  "import { Plus, RefreshCw, Loader2, Trash2, X, ShieldAlert, Mail } from 'lucide-react';",
  "import { Plus, RefreshCw, Loader2, Trash2, X, ShieldAlert, Mail, Copy, Check } from 'lucide-react';"
);

code = code.replace(
  "  const [sendingResetForId, setSendingResetForId] = useState<string | null>(null);",
  "  const [sendingResetForId, setSendingResetForId] = useState<string | null>(null);\n  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);"
);

code = code.replace(
  "  username?: string;\n  total_projects?: number;",
  "  username?: string;\n  first_name?: string;\n  last_name?: string;\n  total_projects?: number;"
);

// Map first_name and last_name from DB RPC if available
code = code.replace(
  "        username: undefined,\n        total_projects: p.total_projects || 0,",
  "        username: undefined,\n        first_name: p.first_name,\n        last_name: p.last_name,\n        total_projects: p.total_projects || 0,"
);

// Map first_name and last_name from auth user if available
code = code.replace(
  "              username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || undefined,",
  "              username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || undefined,\n              first_name: profile.first_name || authUser?.user_metadata?.first_name || undefined,\n              last_name: profile.last_name || authUser?.user_metadata?.last_name || undefined,"
);

// The user column TD contents:
const oldTd = `                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-450">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-sans">
                              {profile.username || 'No Username'}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                Self
                              </span>
                            )}
                          </div>
                          {profile.email && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                              {profile.email}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {profile.id}
                          </span>
                        </div>
                      </td>`;

const newTd = `                      <td className="px-5 py-4 font-sans text-slate-600 dark:text-slate-450">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {(profile.first_name || profile.last_name) 
                                ? \`\${profile.first_name || ''} \${profile.last_name || ''}\`.trim() 
                                : 'Unknown Name'}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                Self
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {profile.email || 'No Email'}
                            </span>
                            {profile.email && (
                              <button
                                onClick={() => {
                                  if (profile.email) {
                                    navigator.clipboard.writeText(profile.email);
                                    setCopiedEmailId(profile.id);
                                    setTimeout(() => setCopiedEmailId(null), 2000);
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="Copy Email"
                              >
                                {copiedEmailId === profile.id ? (
                                  <Check size={14} className="text-emerald-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {profile.id}
                          </span>
                        </div>
                      </td>`;

code = code.replace(oldTd, newTd);

fs.writeFileSync('src/components/Auth/AdminConsole/UserManagementTab.tsx', code);
