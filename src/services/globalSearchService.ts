import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export interface GlobalSearchCase {
  id: number;
  title: string;
  file_number: string | null;
  client_name: string | null;
  status: string | null;
}

export interface GlobalSearchTask {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  case_id: number | null;
  due_date: string | null;
}

export interface GlobalSearchSession {
  id: number;
  case_id: number;
  session_date: string | null;
  session_date_gregorian: string | null;
  session_type: string | null;
  result: string | null;
  case?: {
    id: number;
    title: string;
    file_number: string | null;
  };
}

export interface GlobalSearchDocument {
  id: number;
  title: string;
  file_name: string | null;
  category: string | null;
  case_id: number | null;
}

export interface GlobalSearchResults {
  cases?: GlobalSearchCase[];
  tasks?: GlobalSearchTask[];
  sessions?: GlobalSearchSession[];
  documents?: GlobalSearchDocument[];
}

export const globalSearch = async (query: string): Promise<GlobalSearchResults> => {
  const response = await apiClient.get<ApiResponse<GlobalSearchResults>>(
    `/global-search?q=${encodeURIComponent(query)}`
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || 'فشل البحث');
  }
  return response.data;
};
