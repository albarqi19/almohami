// Export all services for easy importing
export { AuthService } from './authService';
export { CaseService } from './caseService';
export { TaskService } from './taskService';
export { DocumentService } from './documentService';
export { ActivityService } from './activityService';
export { NotificationService } from './notificationService';
export { default as RoleService } from './roleService';
export { default as PermissionService } from './permissionService';

// Legal AI Service
export {
    processLegalAIRequest,
    setGeminiApiKey,
    getGeminiApiKey,
    clearGeminiApiKey,
    hasGeminiApiKey,
    getToolInfo,
    getToolsByCategory,
    LEGAL_AI_TOOLS
} from './legalAIService';

// Export types
export type { LoginResponse, RegisterData } from './authService';
export type { CaseFilters } from './caseService';
export type { TaskFilters } from './taskService';
export type { DocumentFilters, DocumentUpload } from './documentService';
export type { ActivityFilters, CreateActivityData } from './activityService';
export type { NotificationFilters } from './notificationService';
export type { Role, CreateRoleData, UpdateRoleData, RoleFilters } from './roleService';
export type { Permission, CreatePermissionData, UpdatePermissionData, PermissionFilters, GroupedPermission } from './permissionService';
export type { LegalAIToolType, LegalAIRequest, LegalAIResponse, LegalAIToolInfo } from './legalAIService';
