import React from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import './SubscriptionBanner.css';

const SubscriptionBanner: React.FC = () => {
    const { status, isOwner } = useSubscription();

    // Only show for owners when subscription expired
    if (!status?.isExpired || !isOwner) {
        return null;
    }

    return (
        <div className="subscription-banner">
            <div className="subscription-banner__content">
                <AlertTriangle className="subscription-banner__icon" size={16} />
                <span className="subscription-banner__message">
                    اشتراك الشركة منتهي. فضلاً قم بالتجديد للاستمرار في استخدام جميع المزايا.
                </span>
                <Link to="/settings/subscription" className="subscription-banner__button">
                    <CreditCard size={14} />
                    تجديد الاشتراك
                </Link>
            </div>
        </div>
    );
};

export default SubscriptionBanner;
