'use client';

import React from 'react';
import { VerificationLevel } from '@prisma/client';
import { VERIFICATION_BADGES } from '@/lib/verification';

interface TrustBadgeProps {
  trustScore: number;
  verificationLevel: VerificationLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function TrustBadge({
  trustScore,
  verificationLevel,
  size = 'medium',
  showLabel = true,
  showTooltip = true,
  className = ''
}: TrustBadgeProps) {
  const verification = VERIFICATION_BADGES[verificationLevel as keyof typeof VERIFICATION_BADGES];
  
  // Determine trust level and color
  const getTrustLevel = (score: number) => {
    if (score >= 90) return { level: 'Verificat', color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' };
    if (score >= 70) return { level: 'De încredere', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' };
    if (score >= 50) return { level: 'Neutru', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
    if (score >= 30) return { level: 'Suspicios', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' };
    return { level: 'Atenție', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' };
  };
  
  const trust = getTrustLevel(trustScore);
  
  // Size variants
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base'
  };
  
  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Trust Score Badge */}
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border ${trust.bgColor} ${trust.textColor} ${trust.borderColor} ${sizeClasses[size]} font-medium`}
        title={showTooltip ? `Trust Score: ${trustScore}/100 - ${trust.level}` : undefined}
      >
        <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {showLabel && (
          <span>{trustScore}</span>
        )}
      </div>
      
      {/* Verification Badge */}
      {verificationLevel !== 'none' && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border ${
            verificationLevel === 'business' 
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : verificationLevel === 'phone'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          } ${sizeClasses[size]} font-medium`}
          title={showTooltip ? verification.description : undefined}
        >
          <span>{verification.icon}</span>
          {showLabel && (
            <span className="whitespace-nowrap">{verification.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for list views
export function TrustBadgeCompact({ trustScore, verificationLevel }: { trustScore: number; verificationLevel: VerificationLevel }) {
  return (
    <TrustBadge
      trustScore={trustScore}
      verificationLevel={verificationLevel}
      size="small"
      showLabel={false}
      showTooltip={true}
    />
  );
}

// Detailed version for profile pages
export function TrustBadgeDetailed({ 
  trustScore, 
  verificationLevel, 
  accountType,
  memberSince
}: { 
  trustScore: number; 
  verificationLevel: VerificationLevel;
  accountType: 'private' | 'business';
  memberSince: Date;
}) {
  const verification = VERIFICATION_BADGES[verificationLevel as keyof typeof VERIFICATION_BADGES];
  const trust = trustScore >= 90 ? 'Verificat' 
    : trustScore >= 70 ? 'De încredere'
    : trustScore >= 50 ? 'Neutru'
    : trustScore >= 30 ? 'Suspicios'
    : 'Atenție';
  
  const memberFor = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
  const memberForText = memberFor < 30 
    ? `Membru de ${memberFor} zile`
    : memberFor < 365
    ? `Membru de ${Math.floor(memberFor / 30)} luni`
    : `Membru de ${Math.floor(memberFor / 365)} ani`;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TrustBadge
          trustScore={trustScore}
          verificationLevel={verificationLevel}
          size="large"
          showLabel={true}
          showTooltip={false}
        />
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span>Cont {accountType === 'business' ? 'Business' : 'Personal'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span>{memberForText}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Nivel încredere: {trust}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Verificare: {verification.label}</span>
        </div>
      </div>
    </div>
  );
}
