import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Plus, Trash2, Mail, Calendar, CheckCircle } from 'lucide-react'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

export function SettingsModal({ onClose }) {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAccounts()
    }, [])

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/auth/accounts')
            setAccounts(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = (provider) => {
        // Redirect to backend auth
        window.location.href = `http://localhost:8000/api/auth/${provider}/login`
    }

    const handleDisconnect = async (id) => {
        if (window.confirm('Are you sure you want to disconnect this account?')) {
            try {
                await api.delete(`/auth/disconnect/${id}`)
                setAccounts(accounts.filter(a => a.id !== id))
            } catch (err) {
                alert("Failed to disconnect")
            }
        }
    }

    // Check for URL params indicating success/failure (e.g. after redirect)
    // Actually the parent App might handle this or we effectively reload.
    // Since we are in a modal, user likely clicked "Settings" manually. 

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900">Settings & Integrations</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Connected Accounts</h3>
                        {loading ? (
                            <div className="text-center py-4 text-slate-400">Loading...</div>
                        ) : accounts.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500">
                                No accounts connected yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {accounts.map(acc => (
                                    <div key={acc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${acc.provider === 'google' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {acc.provider === 'google' ? <Mail size={18} /> : <Calendar size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 capitalize">{acc.provider}</div>
                                                <div className="text-xs text-slate-500">{acc.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDisconnect(acc.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Disconnect"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => handleConnect('google')}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                            Connect Google Account
                        </button>
                        <button
                            onClick={() => handleConnect('outlook')}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" className="w-5 h-5" />
                            Connect Outlook Account
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Connecting allows you to set reminders and add calendar events for jobs.
                    </p>
                </div>
            </div>
        </div>
    )
}
