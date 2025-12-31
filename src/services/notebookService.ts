import { apiClient } from '../utils/api';

export interface PersonalNote {
    id: number;
    title: string | null;
    content: string;
    category: 'quick_brief' | 'brainstorming' | 'private_todo' | 'legal_quote';
    case_id: number | null;
    client_id: number | null;
    tags: string[] | null;
    is_pinned: boolean;
    is_completed: boolean;
    reminder_at: string | null;
    reminder_sent: boolean;
    created_at: string;
    updated_at: string;
    case?: {
        id: number;
        case_number: string;
        title: string;
    };
    client?: {
        id: number;
        name: string;
    };
}

export interface NoteFilters {
    category?: string;
    case_id?: number;
    is_completed?: boolean;
    search?: string;
    per_page?: number;
    page?: number;
}

export interface NoteStatistics {
    total: number;
    by_category: {
        quick_brief: number;
        brainstorming: number;
        private_todo: number;
        legal_quote: number;
    };
    pending_todos: number;
    with_reminders: number;
    pinned: number;
}

export interface CreateNoteData {
    title?: string;
    content: string;
    category: 'quick_brief' | 'brainstorming' | 'private_todo' | 'legal_quote';
    case_id?: number | null;
    client_id?: number | null;
    tags?: string[];
    reminder_at?: string | null;
}

export interface UpdateNoteData extends Partial<CreateNoteData> { }

export const notebookService = {
    // Get all notes with optional filters
    async getNotes(filters?: NoteFilters): Promise<{ data: PersonalNote[]; meta: unknown }> {
        const params = new URLSearchParams();
        if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters?.case_id) params.append('case_id', String(filters.case_id));
        if (filters?.is_completed !== undefined) params.append('is_completed', String(filters.is_completed));
        if (filters?.search) params.append('search', filters.search);
        if (filters?.per_page) params.append('per_page', String(filters.per_page));
        if (filters?.page) params.append('page', String(filters.page));

        const query = params.toString();
        const response = await apiClient.get<{ data: PersonalNote[]; meta: unknown }>(`/personal-notes${query ? `?${query}` : ''}`);
        return { data: (response as { data: PersonalNote[] }).data || [], meta: response };
    },

    // Get single note by ID
    async getNoteById(id: number): Promise<PersonalNote> {
        const response = await apiClient.get<{ data: PersonalNote }>(`/personal-notes/${id}`);
        return (response as { data: PersonalNote }).data;
    },

    // Create new note
    async createNote(data: CreateNoteData): Promise<PersonalNote> {
        const response = await apiClient.post<{ data: PersonalNote }>('/personal-notes', data);
        return (response as { data: PersonalNote }).data;
    },

    // Update note
    async updateNote(id: number, data: UpdateNoteData): Promise<PersonalNote> {
        const response = await apiClient.put<{ data: PersonalNote }>(`/personal-notes/${id}`, data);
        return (response as { data: PersonalNote }).data;
    },

    // Delete note
    async deleteNote(id: number): Promise<void> {
        await apiClient.delete(`/personal-notes/${id}`);
    },

    // Toggle completion status
    async toggleComplete(id: number): Promise<PersonalNote> {
        const response = await apiClient.patch<{ data: PersonalNote }>(`/personal-notes/${id}/toggle`);
        return (response as { data: PersonalNote }).data;
    },

    // Toggle pinned status
    async togglePin(id: number): Promise<PersonalNote> {
        const response = await apiClient.patch<{ data: PersonalNote }>(`/personal-notes/${id}/pin`);
        return (response as { data: PersonalNote }).data;
    },

    // Convert note to task
    async convertToTask(id: number): Promise<{ note: PersonalNote; task: unknown }> {
        const response = await apiClient.post<{ data: { note: PersonalNote; task: unknown } }>(`/personal-notes/${id}/convert-to-task`);
        return (response as { data: { note: PersonalNote; task: unknown } }).data;
    },

    // Get notes linked to a specific case
    async getCaseNotes(caseId: number): Promise<PersonalNote[]> {
        const response = await apiClient.get<{ data: PersonalNote[] }>(`/personal-notes/case/${caseId}`);
        return (response as { data: PersonalNote[] }).data || [];
    },

    // Get statistics
    async getStatistics(): Promise<NoteStatistics> {
        const response = await apiClient.get<{ data: NoteStatistics }>('/personal-notes/statistics');
        return (response as { data: NoteStatistics }).data;
    },

    // Helper: Get category label in Arabic
    getCategoryLabel(category: string): string {
        const labels: Record<string, string> = {
            'quick_brief': 'ملاحظات الجلسات',
            'brainstorming': 'مسودات الأفكار',
            'private_todo': 'قائمة المهام',
            'legal_quote': 'الاقتباسات القانونية'
        };
        return labels[category] || category;
    },

    // Helper: Get category icon
    getCategoryIcon(category: string): string {
        const icons: Record<string, string> = {
            'quick_brief': '⚡',
            'brainstorming': '💡',
            'private_todo': '✅',
            'legal_quote': '📜'
        };
        return icons[category] || '📝';
    },

    // Helper: Get category color class
    getCategoryColor(category: string): string {
        const colors: Record<string, string> = {
            'quick_brief': 'info',
            'brainstorming': 'warning',
            'private_todo': 'success',
            'legal_quote': 'accent'
        };
        return colors[category] || 'neutral';
    }
};

export default notebookService;
