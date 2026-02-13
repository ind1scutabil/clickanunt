/**
 * ListingCard Component - Composite Component
 * 
 * Complete listing card with image, badges, avatar, price, and actions.
 * 
 * @example
 * ```tsx
 * <ListingCard
 *   title="BMW X5 2020"
 *   price="45,900 €"
 *   image="/car.jpg"
 *   category="Auto"
 *   verified
 *   featured
 * />
 * ```
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Card, Badge, Avatar, Button, Dropdown } from '@/app/components/ui';

export interface ListingCardProps {
  /**
   * Listing ID
   */
  id?: string;
  
  /**
   * Listing title
   */
  title: string;
  
  /**
   * Price text
   */
  price: string;
  
  /**
   * Image URL
   */
  image?: string;
  
  /**
   * Category name
   */
  category?: string;
  
  /**
   * Location
   */
  location?: string;
  
  /**
   * Description
   */
  description?: string;
  
  /**
   * Posted date/time
   */
  postedAt?: string;
  
  /**
   * Seller info
   */
  seller?: {
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  
  /**
   * Verified listing
   */
  verified?: boolean;
  
  /**
   * Featured/promoted
   */
  featured?: boolean;
  
  /**
   * Urgent listing
   */
  urgent?: boolean;
  
  /**
   * Click handlers
   */
  onClick?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  title,
  price,
  image,
  category,
  location,
  description,
  postedAt,
  seller,
  verified = false,
  featured = false,
  urgent = false,
  onClick,
  onSave,
  onShare,
  onReport,
  className,
}) => {
  return (
    <Card
      variant="elevated"
      interactive={!!onClick}
      onClick={onClick}
      className={className}
    >
      <Card.Body className="p-0">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image */}
          {image && (
            <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
              <Image
                src={image}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 192px"
                className="object-cover md:rounded-l-lg"
                unoptimized
              />
              {urgent && (
                <div className="absolute top-3 left-3">
                  <Badge variant="error" size="sm">URGENT</Badge>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {category && (
                    <span className="text-xs text-neutral-400">{category}</span>
                  )}
                  {verified && <Badge variant="success" size="sm">Verificat</Badge>}
                  {featured && <Badge variant="primary" size="sm">Premium</Badge>}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                  {title}
                </h3>
              </div>

              {/* Actions Dropdown */}
              <Dropdown>
                <Dropdown.Trigger>
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Menu align="right">
                  {onSave && (
                    <Dropdown.Item
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      }
                      onClick={() => onSave()}
                    >
                      Salvează
                    </Dropdown.Item>
                  )}
                  {onShare && (
                    <Dropdown.Item
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      }
                      onClick={() => onShare()}
                    >
                      Distribuie
                    </Dropdown.Item>
                  )}
                  {onReport && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        danger
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        }
                        onClick={() => onReport()}
                      >
                        Raportează
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* Description */}
            {description && (
              <p className="text-neutral-300 text-sm mb-4 line-clamp-2">
                {description}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 mt-auto">
              {/* Left side - Location & Time */}
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                {location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {location}
                  </span>
                )}
                {postedAt && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {postedAt}
                  </span>
                )}
              </div>

              {/* Right side - Price */}
              <div className="text-2xl font-bold text-primary-400">
                {price}
              </div>
            </div>

            {/* Seller Info */}
            {seller && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-800">
                <Avatar
                  src={seller.avatar}
                  initials={seller.name.substring(0, 2).toUpperCase()}
                  size="sm"
                  status={seller.verified ? 'online' : undefined}
                />
                <span className="text-sm text-neutral-300">{seller.name}</span>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

ListingCard.displayName = 'ListingCard';

export default ListingCard;
