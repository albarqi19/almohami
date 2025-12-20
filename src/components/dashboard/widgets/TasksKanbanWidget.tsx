import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Plus,
    MoreHorizontal,
    Clock,
    User,
    Flag,
    CheckCircle2,
    Circle,
    Loader2
} from 'lucide-react';
import {
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types
interface Task {
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    assignee?: string;
    dueDate?: string;
    caseTitle?: string;
}

interface Column {
    id: string;
    title: string;
    color: string;
    tasks: Task[];
}

interface TasksKanbanWidgetProps {
    columns?: Column[];
    onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
    onTaskClick?: (task: Task) => void;
    onAddTask?: (columnId: string) => void;
}

// Sortable Task Card
const SortableTaskCard: React.FC<{
    task: Task;
    onClick?: () => void;
}> = ({ task, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const priorityColors = {
        high: 'var(--clickup-red)',
        medium: 'var(--clickup-orange)',
        low: 'var(--clickup-green)'
    };

    const priorityLabels = {
        high: 'عالية',
        medium: 'متوسطة',
        low: 'منخفضة'
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`kanban-card ${isDragging ? 'kanban-card--dragging' : ''}`}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            layout
        >
            <div className="kanban-card__title">{task.title}</div>

            {task.caseTitle && (
                <div
                    style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    📁 {task.caseTitle}
                </div>
            )}

            <div className="kanban-card__meta">
                <div className="kanban-card__priority">
                    <span
                        className="kanban-card__priority-dot"
                        style={{ background: priorityColors[task.priority] }}
                    />
                    <span>{priorityLabels[task.priority]}</span>
                </div>

                {task.dueDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{task.dueDate}</span>
                    </div>
                )}

                {task.assignee && (
                    <div
                        className="kanban-card__assignee"
                        title={task.assignee}
                    >
                        {task.assignee.charAt(0)}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Task Card for Drag Overlay
const TaskCardOverlay: React.FC<{ task: Task }> = ({ task }) => (
    <div className="kanban-card kanban-card--dragging">
        <div className="kanban-card__title">{task.title}</div>
    </div>
);

// Kanban Column
const KanbanColumn: React.FC<{
    column: Column;
    onAddTask?: () => void;
    onTaskClick?: (task: Task) => void;
}> = ({ column, onAddTask, onTaskClick }) => {
    const dotClass = {
        new: 'kanban-column__dot--new',
        progress: 'kanban-column__dot--progress',
        done: 'kanban-column__dot--done'
    }[column.id] || '';

    return (
        <motion.div
            className="kanban-column"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="kanban-column__header">
                <div className="kanban-column__title">
                    <span
                        className={`kanban-column__dot ${dotClass}`}
                        style={{ background: column.color }}
                    />
                    <span>{column.title}</span>
                    <span className="kanban-column__count">{column.tasks.length}</span>
                </div>
                <button
                    className="widget__action-btn"
                    style={{ width: '24px', height: '24px' }}
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>

            <SortableContext
                items={column.tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="kanban-column__cards">
                    <AnimatePresence>
                        {column.tasks.map(task => (
                            <SortableTaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick?.(task)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </SortableContext>

            <button className="kanban-add-card" onClick={onAddTask}>
                <Plus size={16} />
                <span>إضافة مهمة</span>
            </button>
        </motion.div>
    );
};

// Main Kanban Widget
const TasksKanbanWidget: React.FC<TasksKanbanWidgetProps> = ({
    columns: initialColumns,
    onTaskMove,
    onTaskClick,
    onAddTask
}) => {
    // Default demo data
    const defaultColumns: Column[] = [
        {
            id: 'new',
            title: 'جديد',
            color: 'var(--clickup-blue)',
            tasks: [
                { id: '1', title: 'مراجعة عقد الشراكة', priority: 'high', assignee: 'أحمد', dueDate: 'اليوم', caseTitle: 'قضية العقارات' },
                { id: '2', title: 'إعداد صحيفة الدعوى', priority: 'medium', assignee: 'محمد' },
                { id: '3', title: 'جمع المستندات المطلوبة', priority: 'low', dueDate: 'غداً' },
            ]
        },
        {
            id: 'progress',
            title: 'قيد العمل',
            color: 'var(--clickup-orange)',
            tasks: [
                { id: '4', title: 'التواصل مع الموكل', priority: 'high', assignee: 'سارة', caseTitle: 'نزاع تجاري' },
                { id: '5', title: 'مراجعة الأدلة', priority: 'medium', dueDate: 'بعد غد' },
            ]
        },
        {
            id: 'done',
            title: 'مكتمل',
            color: 'var(--clickup-green)',
            tasks: [
                { id: '6', title: 'تسجيل عقد الوكالة', priority: 'low', assignee: 'خالد' },
                { id: '7', title: 'حضور الجلسة', priority: 'high', dueDate: 'تم', caseTitle: 'قضية عمالية' },
            ]
        }
    ];

    const [columns, setColumns] = useState<Column[]>(initialColumns || defaultColumns);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const findTask = (id: string): Task | undefined => {
        for (const column of columns) {
            const task = column.tasks.find(t => t.id === id);
            if (task) return task;
        }
        return undefined;
    };

    const findColumn = (taskId: string): Column | undefined => {
        return columns.find(column => column.tasks.some(t => t.id === taskId));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = findTask(event.active.id as string);
        setActiveTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeColumn = findColumn(activeId);
        const overColumn = findColumn(overId) || columns.find(c => c.id === overId);

        if (!activeColumn || !overColumn) return;

        if (activeColumn.id !== overColumn.id) {
            setColumns(prev => {
                const activeColumnIndex = prev.findIndex(c => c.id === activeColumn.id);
                const overColumnIndex = prev.findIndex(c => c.id === overColumn.id);
                const activeTaskIndex = prev[activeColumnIndex].tasks.findIndex(t => t.id === activeId);
                const task = prev[activeColumnIndex].tasks[activeTaskIndex];

                const newColumns = [...prev];
                newColumns[activeColumnIndex] = {
                    ...newColumns[activeColumnIndex],
                    tasks: newColumns[activeColumnIndex].tasks.filter(t => t.id !== activeId)
                };
                newColumns[overColumnIndex] = {
                    ...newColumns[overColumnIndex],
                    tasks: [...newColumns[overColumnIndex].tasks, task]
                };

                return newColumns;
            });

            onTaskMove?.(activeId, activeColumn.id, overColumn.id);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="kanban-board">
                {columns.map(column => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        onAddTask={() => onAddTask?.(column.id)}
                        onTaskClick={onTaskClick}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTask && <TaskCardOverlay task={activeTask} />}
            </DragOverlay>
        </DndContext>
    );
};

export default TasksKanbanWidget;
