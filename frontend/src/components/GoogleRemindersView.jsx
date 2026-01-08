import React, { useState, useEffect } from 'react';
import { Check, Calendar, List, AlertCircle, RefreshCw } from 'lucide-react';

const GoogleRemindersView = ({ accountId, onClose }) => {
    const [taskLists, setTaskLists] = useState([]);
    const [selectedList, setSelectedList] = useState('@default');
    const [items, setItems] = useState([]); // Tasks or Events
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('tasks'); // 'tasks' or 'events'
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTaskLists();
        fetchItems();
    }, [accountId, viewMode, selectedList]);

    const fetchTaskLists = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/reminders/google/tasklists?account_id=${accountId}`);
            if (res.ok) {
                const data = await res.json();
                setTaskLists(data);
            }
        } catch (err) {
            console.error("Failed to fetch task lists", err);
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        setItems([]);
        try {
            let url = '';
            if (viewMode === 'events') {
                url = `http://localhost:8000/api/reminders/calendar/events/${accountId}`;
            } else {
                url = `http://localhost:8000/api/reminders/tasks/${accountId}?list_id=${selectedList}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch data");
            const data = await res.json();
            setItems(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/95 flex justify-center items-center z-50 p-6 overflow-hidden">
            <div className="bg-[#0f1115] w-full max-w-6xl h-full max-h-[90vh] rounded-xl flex border border-gray-800 shadow-2xl overflow-hidden relative">

                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-10 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    ✕
                </button>

                {/* Sidebar */}
                <div className="w-64 border-r border-gray-800 bg-[#161b22] flex flex-col">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5b/Google_Tasks_2021.svg" className="w-6 h-6" alt="Tasks" />
                            Google Tasks
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Calendar Section */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Calendar</h3>
                            <button
                                onClick={() => setViewMode('events')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'events' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <Calendar size={16} />
                                Upcoming Events
                            </button>
                        </div>

                        {/* Task Lists Section */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Lists</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => { setViewMode('tasks'); setSelectedList('@default'); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'tasks' && selectedList === '@default' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800'
                                        }`}
                                >
                                    <List size={16} />
                                    Default List
                                </button>
                                {taskLists.map(list => (
                                    <button
                                        key={list.id}
                                        onClick={() => { setViewMode('tasks'); setSelectedList(list.id); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'tasks' && selectedList === list.id ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800'
                                            }`}
                                    >
                                        <List size={16} />
                                        {list.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <p className="text-xs text-gray-600">Connected: {accountId}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[#0f1115] overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white">
                            {viewMode === 'events' ? 'Upcoming Calendar Events' :
                                (taskLists.find(l => l.id === selectedList)?.title || 'Tasks')}
                        </h1>
                        <button
                            onClick={fetchItems}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-transparent border border-gray-700 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center text-gray-500 mt-20">
                                <p>No {viewMode === 'events' ? 'upcoming events' : 'tasks'} found.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="group bg-[#161b22] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all">
                                        <div className="flex items-start gap-4">
                                            {viewMode === 'tasks' && (
                                                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${item.status === 'completed'
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'border-gray-600 text-transparent'
                                                    }`}>
                                                    <Check size={12} />
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <h3 className={`font-medium ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                    {item.title || item.summary || '(No Title)'}
                                                </h3>

                                                {(item.notes || item.description) && (
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                        {item.notes || item.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 mt-2">
                                                    {(item.due || (item.start && (item.start.dateTime || item.start.date))) && (
                                                        <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/30">
                                                            Due: {new Date(item.due || item.start?.dateTime || item.start?.date).toLocaleDateString()}
                                                            {item.start?.dateTime && ` ${new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                        </span>
                                                    )}

                                                    {item.htmlLink && (
                                                        <a
                                                            href={item.htmlLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-gray-500 hover:text-white underline"
                                                        >
                                                            Open in Google
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleRemindersView;
