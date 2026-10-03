import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

export const ClaimStatusBadge = ({ status }) => {
  const normStatus = (status || '').toUpperCase();

  switch (normStatus) {
    case 'APPROVED':
    case 'COMPLIANT':
      return (
        <span className="badge badge-approved">
          <CheckCircle2 size={13} /> {normStatus}
        </span>
      );
    case 'PENDING_REVIEW':
    case 'PENDING':
      return (
        <span className="badge badge-pending">
          <Clock size={13} /> PENDING
        </span>
      );
    case 'REJECTED':
    case 'NON_COMPLIANT':
      return (
        <span className="badge badge-rejected">
          <XCircle size={13} /> {normStatus}
        </span>
      );
    case 'CLARIFICATION_REQUESTED':
    case 'NEEDS_CLARIFICATION':
    case 'REQUIRES_REVIEW':
      return (
        <span className="badge badge-clarification">
          <AlertCircle size={13} /> {normStatus.replace(/_/g, ' ')}
        </span>
      );
    default:
      return (
        <span className="badge badge-pending">
          <HelpCircle size={13} /> {normStatus || 'UNKNOWN'}
        </span>
      );
  }
};
