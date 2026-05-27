import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DocumentRequestService } from '../services/documentRequestService';
import type {
  CreateDocumentRequestPayload,
  CreateItemPayload,
  UpdateDocumentRequestPayload,
  UploadUrlPayload,
} from '../types/documentRequests';

// Query keys
export const documentRequestKeys = {
  all: ['document-requests'] as const,
  byCaseList: (caseId: number | string) => [...documentRequestKeys.all, 'by-case', String(caseId)] as const,
  detail: (id: number | string) => [...documentRequestKeys.all, 'detail', String(id)] as const,
  timeline: (id: number | string) => [...documentRequestKeys.all, 'timeline', String(id)] as const,
  clientList: () => [...documentRequestKeys.all, 'client', 'list'] as const,
  clientDetail: (id: number | string) => [...documentRequestKeys.all, 'client', 'detail', String(id)] as const,
};

// ============================================================
// Lawyer hooks
// ============================================================

export function useCaseDocumentRequests(caseId: number | string | null | undefined) {
  return useQuery({
    queryKey: documentRequestKeys.byCaseList(caseId ?? 'none'),
    queryFn: () => DocumentRequestService.listByCase(caseId!),
    enabled: !!caseId,
  });
}

export function useDocumentRequest(requestId: number | string | null | undefined) {
  return useQuery({
    queryKey: documentRequestKeys.detail(requestId ?? 'none'),
    queryFn: () => DocumentRequestService.show(requestId!),
    enabled: !!requestId,
  });
}

export function useDocumentRequestTimeline(requestId: number | string | null | undefined) {
  return useQuery({
    queryKey: documentRequestKeys.timeline(requestId ?? 'none'),
    queryFn: () => DocumentRequestService.timeline(requestId!),
    enabled: !!requestId,
  });
}

export function useCreateDocumentRequest(caseId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentRequestPayload) =>
      DocumentRequestService.create(caseId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.byCaseList(caseId) });
    },
  });
}

export function useUpdateDocumentRequest(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDocumentRequestPayload) =>
      DocumentRequestService.update(requestId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      if (data.case_id) {
        qc.invalidateQueries({ queryKey: documentRequestKeys.byCaseList(data.case_id) });
      }
    },
  });
}

export function useSendDocumentRequest(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => DocumentRequestService.send(requestId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      qc.invalidateQueries({ queryKey: documentRequestKeys.timeline(requestId) });
      if (data.case_id) {
        qc.invalidateQueries({ queryKey: documentRequestKeys.byCaseList(data.case_id) });
      }
    },
  });
}

export function useCancelDocumentRequest(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => DocumentRequestService.cancel(requestId, reason),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      if (data.case_id) {
        qc.invalidateQueries({ queryKey: documentRequestKeys.byCaseList(data.case_id) });
      }
    },
  });
}

export function useDeleteDocumentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number | string) => DocumentRequestService.destroy(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.all });
    },
  });
}

// Items
export function useAddItem(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateItemPayload) =>
      DocumentRequestService.storeItem(requestId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
    },
  });
}

export function useUpdateItem(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number | string; payload: Partial<CreateItemPayload> }) =>
      DocumentRequestService.updateItem(itemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
    },
  });
}

export function useDeleteItem(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number | string) => DocumentRequestService.destroyItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
    },
  });
}

// Submission review
export function useApproveSubmission(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: number | string) =>
      DocumentRequestService.approveSubmission(submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      qc.invalidateQueries({ queryKey: documentRequestKeys.timeline(requestId) });
    },
  });
}

export function useRejectSubmission(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: number | string; reason: string }) =>
      DocumentRequestService.rejectSubmission(submissionId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      qc.invalidateQueries({ queryKey: documentRequestKeys.timeline(requestId) });
    },
  });
}

export function useHideSubmission(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: number | string) =>
      DocumentRequestService.hideSubmission(submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.detail(requestId) });
      qc.invalidateQueries({ queryKey: documentRequestKeys.timeline(requestId) });
    },
  });
}

// ============================================================
// Client hooks
// ============================================================

export function useMyDocumentRequests() {
  return useQuery({
    queryKey: documentRequestKeys.clientList(),
    queryFn: () => DocumentRequestService.listMine(),
  });
}

export function useMyDocumentRequest(requestId: number | string | null | undefined) {
  return useQuery({
    queryKey: documentRequestKeys.clientDetail(requestId ?? 'none'),
    queryFn: () => DocumentRequestService.showMine(requestId!),
    enabled: !!requestId,
    // refetch دوري لمتابعة حالة الـ AI analysis
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data?.items) return false;
      // إذا فيه أي submission ai_status=pending أو processing → 5 ثوانٍ
      const hasPending = data.items.some((item) =>
        (item.submissions ?? []).some(
          (s) =>
            s.document?.ai_status === 'pending' || s.document?.ai_status === 'processing'
        )
      );
      return hasPending ? 5000 : false;
    },
  });
}

export function useClientUploadUrl() {
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number | string; payload: UploadUrlPayload }) =>
      DocumentRequestService.getUploadUrl(itemId, payload),
  });
}

export function useClientRegisterUpload(requestId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, onedriveFileId }: { itemId: number | string; onedriveFileId: string }) =>
      DocumentRequestService.registerUpload(itemId, onedriveFileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentRequestKeys.clientDetail(requestId) });
      qc.invalidateQueries({ queryKey: documentRequestKeys.clientList() });
    },
  });
}
