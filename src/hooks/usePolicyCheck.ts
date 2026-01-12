import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface PolicyData {
  title: string;
  content: string;
}

export const usePolicyCheck = () => {
  const { user } = useAuth();
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // العملاء لا يحتاجون للموافقة
    if (!user || user.role === 'client') {
      setIsChecking(false);
      return;
    }

    checkPolicyStatus();
  }, [user]);

  const checkPolicyStatus = async () => {
    try {
      setIsChecking(true);
      const response: any = await apiClient.get('/policy/check-status');

      if (response.success) {
        setNeedsAcknowledgment(response.data.needs_acknowledgment);

        if (response.data.needs_acknowledgment && response.data.policy) {
          setPolicyData(response.data.policy);
        }
      }
    } catch (error) {
      console.error('Failed to check policy status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAcknowledged = () => {
    setNeedsAcknowledgment(false);
    setPolicyData(null);
  };

  return {
    needsAcknowledgment,
    policyData,
    isChecking,
    handleAcknowledged,
  };
};
