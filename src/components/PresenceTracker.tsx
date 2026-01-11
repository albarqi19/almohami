import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../hooks/usePresence';

/**
 * Invisible component that activates presence tracking for lawyers/legal assistants
 * Should be placed in the main Layout to track activity across the app
 */
export const PresenceTracker: React.FC = () => {
    const { user } = useAuth();

    // Only track for specific roles
    const shouldTrack = user && ['lawyer', 'senior_lawyer', 'legal_assistant'].includes(user.role || '');

    // Use the presence hook - it handles all the heartbeat logic
    usePresence();

    useEffect(() => {
        if (shouldTrack) {
            console.log('[PresenceTracker] Active for user:', user?.name);
        }
    }, [shouldTrack, user?.name]);

    // This component doesn't render anything visible
    return null;
};

export default PresenceTracker;
