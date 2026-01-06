import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, GripVertical, Building2, MapPin, Calendar } from 'lucide-react';

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
});

const COLUMNS = [
    { id: 'SAVED', title: 'Saved' },
    { id: 'APPLIED', title: 'Applied' },
    { id: 'INTERVIEWING', title: 'Interviewing' },
    { id: 'OFFER', title: 'Offer' },
    { id: 'REJECTED', title: 'Rejected' },
];

export function KanbanBoard() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/jobs');
            // Filter out 'NEW' jobs or 'Legacy' if preferred? 
            // User said "Saved" is the first column. NEW jobs stick in dashboard?
            // "When click selected records... open kanban board".
            // We will show ALL jobs that have a status appearing in our columns.
            // Usually "NEW" is the pool to pick from in Dashboard. "SAVED" starts the board.
            // So we filter:
            const boardJobs = res.data.filter(j =>
                ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].includes(j.my_status)
            );
            setJobs(boardJobs);
        } catch (err) {
            console.error("Failed to fetch jobs", err);
        }
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        const activeUrl = active.id;
        setActiveId(null);

        if (!over) return;

        // Find source and destination containers
        // In our case, the container ID is the column ID (status)
        // The items are sortable, so 'over' could be a card OR a column container.

        // We need to determine the new status.
        let newStatus = null;

        const activeJob = jobs.find(j => j.job_url === activeUrl);
        if (!activeJob) return;

        if (COLUMNS.find(c => c.id === over.id)) {
            // Dropped directly on a column container (e.g. empty column)
            newStatus = over.id;
        } else {
            // Dropped on another card
            const overJob = jobs.find(j => j.job_url === over.id);
            if (overJob) {
                newStatus = overJob.my_status;
            }
        }

        if (newStatus && newStatus !== activeJob.my_status) {
            // Optimistic Update
            const updatedJobs = jobs.map(j => {
                if (j.job_url === activeUrl) {
                    return { ...j, my_status: newStatus };
                }
                return j;
            });
            setJobs(updatedJobs);

            // API Call
            try {
                await api.post('/jobs/update', { url: activeUrl, status: newStatus });
            } catch (err) {
                console.error("Failed to update status", err);
                // Revert? (Not implemented for simplicity, hopefully stable)
            }
        }
    };

    // Helper to get jobs for a column
    const getJobsForColumn = (columnId) => {
        return jobs.filter(j => j.my_status === columnId);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <h1 className="text-xl font-bold text-slate-800">Application Board</h1>
            </header>

            <main className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full p-6 min-w-max flex gap-6 items-start">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {COLUMNS.map(col => (
                            <Column
                                key={col.id}
                                id={col.id}
                                title={col.title}
                                jobs={getJobsForColumn(col.id)}
                            />
                        ))}

                        <DragOverlay>
                            {activeId ? (
                                <JobCard job={jobs.find(j => j.job_url === activeId)} isOverlay />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </main>
        </div>
    );
}

function Column({ id, title, jobs }) {
    return (
        <div className="bg-slate-200 rounded-xl w-80 flex flex-col max-h-full shadow-sm">
            <div className="p-4 font-semibold text-slate-700 flex justify-between items-center sticky top-0 bg-slate-200 rounded-t-xl z-10">
                <span>{title}</span>
                <span className="bg-slate-300 text-slate-600 text-xs px-2 py-1 rounded-full">{jobs.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                <SortableContext
                    id={id}
                    items={jobs.map(j => j.job_url)}
                    strategy={verticalListSortingStrategy}
                >
                    {jobs.map(job => (
                        <SortableJobCard key={job.job_url} job={job} />
                    ))}
                    {/* Empty placeholder to allow dropping on empty column is handled by container id in DndContext */}
                </SortableContext>
            </div>
        </div>
    );
}

function SortableJobCard({ job }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: job.job_url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <JobCard job={job} />
        </div>
    );
}

function JobCard({ job, isOverlay }) {
    if (!job) return null;

    return (
        <div className={`
            bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow
            ${isOverlay ? "shadow-xl ring-2 ring-indigo-500 scale-105 rotate-2" : ""}
        `}>
            <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-2 line-clamp-2">{job.title}</h3>

            <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                    <Building2 size={12} />
                    <span className="truncate">{job.company}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span className="truncate">{job.location || job.city}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={12} />
                    <span>{new Date(job.date_found || Date.now()).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="mt-3 flex gap-2">
                <span className={`
                    text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border
                    ${job.site === 'linkedin' ? 'text-blue-600 border-blue-100 bg-blue-50' :
                        job.site === 'indeed' ? 'text-blue-800 border-blue-100 bg-blue-50' :
                            job.site === 'glassdoor' ? 'text-green-600 border-green-100 bg-green-50' :
                                'text-slate-600 border-slate-100 bg-slate-50'}
                `}>
                    {job.site}
                </span>
            </div>
        </div>
    );
}
