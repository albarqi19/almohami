// Export all services for easy importing
export { AuthService } from './authService';
export { CaseService } from './caseService';
export { TaskService } from './taskService';
export { DocumentService } from './documentService';
export { ActivityService } from './activityService';
export { NotificationService } from './notificationService';

// Export types
export type { LoginResponse, RegisterData } from './authService';
export type { CaseFilters } from './caseService';
export type { TaskFilters } from './taskService';
export type { DocumentFilters, DocumentUpload } from './documentService';
export type { ActivityFilters, CreateActivityData } from './activityService';
export type { NotificationFilters } from './notificationService';
