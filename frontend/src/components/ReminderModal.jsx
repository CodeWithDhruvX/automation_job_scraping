import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Calendar, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

export function ReminderModal({ job, onClose }) {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState('select') // select, form, success
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [reminderType, setReminderType] = useState('calendar') // calendar, email
    const [dateTime, setDateTime] = useState('')

    // Set default datetime to tomorrow 9am
    useEffect(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(9, 0, 0, 0)
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const iso = d.toISOString().slice(0, 16)
        setDateTime(iso)

        fetchAccounts()
    }, [])

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/auth/accounts')
            setAccounts(res.data)
            if (res.data.length > 0) {
                setSelectedAccount(res.data[0].id)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!selectedAccount) return
        setSubmitting(true)
        try {
            if (reminderType === 'calendar') {
                await api.post('/reminders/calendar', {
                    account_id: selectedAccount,
                    job_details: job,
                    time: new Date(dateTime).toISOString()
                })
            } else {
                await api.post('/reminders/email', {
                    account_id: selectedAccount,
                    job_details: job
                })
            }
            setStep('success')
            setTimeout(() => {
                onClose()
            }, 2000)
        } catch (err) {
            alert("Failed to set reminder: " + (err.response?.data?.detail || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Set Reminder</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle size={24} />
                            </div>
                            <p className="text-slate-600">You haven't connected any accounts yet.</p>
                            <button
                                onClick={() => { onClose(); window.location.href = '/settings?open=true' }} // Hacky navigation or just tell them
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                            >
                                Connect Account (Go to Settings)
                            </button>
                        </div>
                    ) : step === 'success' ? (
                        <div className="text-center space-y-4 py-8">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={24} />
                            </div>
                            <p className="text-lg font-medium text-slate-900">Reminder Set!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedAccount || ''}
                                    onChange={e => setSelectedAccount(e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.provider} ({acc.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${reminderType === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('calendar')}
                                >
                                    Calendar Event
                                </button>
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${reminderType === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('email')}
                                >
                                    Email Self
                                </button>
                            </div>

                            {reminderType === 'calendar' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">When?</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dateTime}
                                        onChange={e => setDateTime(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    {reminderType === 'calendar' ? 'Add to Calendar' : 'Send Email'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
