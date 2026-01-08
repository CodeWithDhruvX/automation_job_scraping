import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Calendar, Mail, Loader2, CheckCircle, AlertCircle, StickyNote, CheckSquare } from 'lucide-react'
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

const FLATPICKR_OPTIONS = {
    minDate: "today",
    time_24hr: false,
    minuteIncrement: 1,
    dateFormat: "Y-m-d h:i K",
    disableMobile: true,
}

export function ReminderModal({ job, onClose }) {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState('select') // select, form, success
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [reminderType, setReminderType] = useState('calendar') // calendar, email, onenote
    const [dateTime, setDateTime] = useState(null)
    const [attendees, setAttendees] = useState('')
    const [ccAttendees, setCcAttendees] = useState('')
    const [reminderMinutes, setReminderMinutes] = useState('15')

    // Set default datetime to tomorrow 9am
    useEffect(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(9, 0, 0, 0)
        setDateTime(d)

        fetchAccounts()
    }, [])
    const [description, setDescription] = useState(job.description || '')
    const [fetchingDesc, setFetchingDesc] = useState(false)



    useEffect(() => {
        if (!job.description && !description) {
            setFetchingDesc(true)
            api.post('/jobs/fetch_desc', { url: job.job_url })
                .then(res => {
                    setDescription(res.data.description)
                })
                .catch(err => console.error("Failed to fetch desc for reminder", err))
                .finally(() => setFetchingDesc(false))
        }
    }, [job])

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/auth/accounts')
            // Inject static Outlook Web option
            const allAccounts = [
                ...res.data,
                { id: 'outlook-web', provider: 'Outlook Web (No Login)', email: 'External', isStatic: true }
            ]
            setAccounts(allAccounts)
            if (allAccounts.length > 0) {
                // Default to the first one if not set
                if (!selectedAccount) setSelectedAccount(allAccounts[0].id)
            }
        } catch (err) {
            console.error(err)
            // Even on error, show Outlook Web
            setAccounts([{ id: 'outlook-web', provider: 'Outlook Web (No Login)', email: 'External', isStatic: true }])
            setSelectedAccount('outlook-web')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (reminderType !== 'onenote' && !selectedAccount) return
        setSubmitting(true)

        try {
            // Handle Static Outlook Web or OneNote
            // NOTE: "Tasks" is not supported for outlook-web, so we force it to skip this block if type is tasks
            if (reminderType === 'onenote' || (selectedAccount === 'outlook-web' && reminderType !== 'tasks')) {
                if (reminderType === 'calendar') {
                    const start = dateTime ? new Date(dateTime) : new Date()
                    const end = new Date(start.getTime() + 30 * 60000) // 30 mins

                    const subject = encodeURIComponent(`Follow up: ${job.title}`)

                    // Truncate description to avoid URL length issues (approx 2000 chars safe)
                    const descText = description || ''
                    const truncatedDesc = descText.length > 1500 ? descText.substring(0, 1500) + '...' : descText

                    const bodyContent = `Follow up on application for ${job.title} at ${job.company}.\n\nLink: ${job.job_url}\n\nDescription:\n${truncatedDesc}`
                    const body = encodeURIComponent(bodyContent)

                    // Construct Floating Time (Local Clock Time) for Outlook
                    // Outlook treats YYYY-MM-DDTHH:mm:ss without Z as strict local time
                    const formatLocal = (d) => {
                        const pad = n => n < 10 ? '0' + n : n
                        return d.getFullYear() + '-' +
                            pad(d.getMonth() + 1) + '-' +
                            pad(d.getDate()) + 'T' +
                            pad(d.getHours()) + ':' +
                            pad(d.getMinutes()) + ':' +
                            pad(d.getSeconds())
                    }

                    const startStr = formatLocal(start)
                    const endStr = formatLocal(end)

                    const location = encodeURIComponent(job.location || '')
                    const to = encodeURIComponent(attendees)
                    const cc = encodeURIComponent(ccAttendees)
                    const reminder = encodeURIComponent(reminderMinutes)

                    const url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${startStr}&enddt=${endStr}&subject=${subject}&body=${body}&location=${location}&to=${to}&cc=${cc}&reminder=${reminder}`

                    window.open(url, '_blank')
                } else if (reminderType === 'onenote') {
                    // Copy to Clipboard Logic
                    try {
                        const htmlContent = `
                            <h1 style="color:#2e1065; margin-bottom:8px;">${job.title}</h1>
                            <p style="font-weight:bold; margin:0;">${job.company} - ${job.location || 'Remote'}</p>
                            <p style="margin-bottom:16px;"><a href="${job.job_url}">View Job Posting</a></p>
                            <hr />
                            <div style="margin-top:16px; white-space: pre-wrap;">${description || 'No description available.'}</div>
                        `

                        const textContent = `${job.title}\n${job.company} - ${job.location || 'Remote'}\nLink: ${job.job_url}\n\n${description || ''}`

                        const blobHtml = new Blob([htmlContent], { type: 'text/html' })
                        const blobText = new Blob([textContent], { type: 'text/plain' })

                        const data = [new ClipboardItem({
                            'text/html': blobHtml,
                            'text/plain': blobText
                        })]

                        await navigator.clipboard.write(data)

                        // Show success message briefly inside modal logic if needed,
                        // but we rely on the generic success step below
                    } catch (err) {
                        console.error("Clipboard write failed", err)
                        // Fallback usually not needed for modern browsers in secure context,
                        // but alert if it fails
                        alert("Failed to copy to clipboard. Please try again.")
                        setSubmitting(false)
                        return
                    }
                } else {
                    // Mailto for email
                    const subject = encodeURIComponent(`Reminder: ${job.title}`)
                    const body = encodeURIComponent(`Don't forget to check on this job:\n\n${job.title} at ${job.company}\n\nLink: ${job.job_url}`)
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                }

                setStep('success')
                setTimeout(() => {
                    onClose()
                }, 2000)
                setSubmitting(false)
                return
            }

            // Regular Backend API Call for connected accounts
            if (reminderType === 'calendar') {
                await api.post('/reminders/calendar', {
                    account_id: selectedAccount,
                    job_details: { ...job, description }, // Pass potentially fetched description
                    time: dateTime.toISOString()
                })
            } else if (reminderType === 'tasks') {
                await api.post('/reminders/tasks', {
                    account_id: selectedAccount,
                    job_details: { ...job, description },
                    due_date: dateTime.toISOString()
                })
            } else {
                await api.post('/reminders/email', {
                    account_id: selectedAccount,
                    job_details: { ...job, description }
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
                    <h3 className="font-bold text-slate-900">Set Reminder / Save</h3>
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
                            <p className="text-lg font-medium text-slate-900">Action Complete!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reminderType !== 'onenote' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={selectedAccount || ''}
                                        onChange={e => setSelectedAccount(e.target.value)}
                                    >
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.isStatic ? acc.provider : `${acc.provider} (${acc.email})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${reminderType === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('calendar')}
                                    title="Add to Calendar"
                                >
                                    <Calendar size={16} />
                                    <span className="hidden sm:inline">Calendar</span>
                                </button>
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${reminderType === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('email')}
                                    title="Send Email"
                                >
                                    <Mail size={16} />
                                    <span className="hidden sm:inline">Email</span>
                                </button>
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${reminderType === 'onenote' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('onenote')}
                                    title="Save to OneNote"
                                >
                                    <StickyNote size={16} />
                                    <span className="hidden sm:inline">OneNote</span>
                                </button>
                                <button
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-2 ${reminderType === 'tasks' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setReminderType('tasks')}
                                    title="Add to Google Tasks"
                                >
                                    <CheckSquare size={16} />
                                    <span className="hidden sm:inline">Tasks</span>
                                </button>
                            </div>

                            {(reminderType === 'calendar' || reminderType === 'tasks') && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {reminderType === 'tasks' ? 'Due Date' : 'When?'}
                                        </label>
                                        <Flatpickr
                                            data-enable-time
                                            value={dateTime}
                                            onChange={([date]) => {
                                                if (date) setDateTime(date)
                                            }}
                                            options={FLATPICKR_OPTIONS}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>

                                    {selectedAccount === 'outlook-web' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Attendees (To)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="email1@example.com, email2@example.com"
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={attendees}
                                                        onChange={e => setAttendees(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Optional (Cc)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="manager@example.com"
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={ccAttendees}
                                                        onChange={e => setCcAttendees(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reminder Alert</label>
                                                    <select
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={reminderMinutes}
                                                        onChange={e => setReminderMinutes(e.target.value)}
                                                    >
                                                        <option value="0">At time of event</option>
                                                        <option value="5">5 minutes before</option>
                                                        <option value="15">15 minutes before</option>
                                                        <option value="30">30 minutes before</option>
                                                        <option value="60">1 hour before</option>
                                                        <option value="1440">1 day before</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {reminderType === 'onenote' && (
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
                                    <StickyNote className="mx-auto mb-2 text-purple-600" size={32} />
                                    <p className="text-sm text-purple-800 font-medium">Copy for OneNote</p>
                                    <p className="text-xs text-purple-600 mt-1">
                                        This will copy the job details to your clipboard.
                                        <br />
                                        Simply switch to OneNote and paste <b>(Ctrl+V)</b> to create your formatted page.
                                    </p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className={`w-full py-2.5 rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white
                                        ${reminderType === 'onenote' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}
                                    `}
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    {reminderType === 'calendar' ? 'Add to Calendar' : reminderType === 'onenote' ? 'Copy to Clipboard' : reminderType === 'tasks' ? 'Add Task' : 'Send Email'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
