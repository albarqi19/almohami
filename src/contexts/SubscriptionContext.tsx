import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionStatus {
    hasAccess: boolean;
    isExpired: boolean;
    isTrial: boolean;
    trialExpired: boolean;
    requiresRenewal: boolean;
    canAccessData: boolean;
    isReadOnly: boolean;
    trialEndsAt: string | null;
}

interface SubscriptionContextType {
    status: SubscriptionStatus | null;
    isOwner: boolean;
    isLawyer: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
    children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
    const { user } = useAuth();

    // Build subscription status from user data
    const status: SubscriptionStatus | null = user ? {
        hasAccess: user.subscription_status?.has_access ?? (user.subscription_active || user.is_trial || false),
        isExpired: user.subscription_status ? !user.subscription_status.has_access : !(user.subscription_active || user.is_trial),
        isTrial: user.is_trial || false,
        trialExpired: user.subscription_status?.trial_expired || false,
        requiresRenewal: user.subscription_status?.requires_renewal ?? !(user.subscription_active || user.is_trial),
        canAccessData: user.subscription_active || user.is_trial || false,
        isReadOnly: user.subscription_status ? !user.subscription_status.has_access : !(user.subscription_active || user.is_trial),
        trialEndsAt: user.trial_ends_at || null
    } : null;

    // Determine user role
    const isOwner = user ? (user.is_tenant_owner || user.role === 'admin') : false;
    const isLawyer = user ? ['lawyer', 'senior_lawyer', 'legal_assistant'].includes(user.role) : false;

    return (
        <SubscriptionContext.Provider value={{ status, isOwner, isLawyer }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = (): SubscriptionContextType => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    return context;
};
