import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import {
  getNextListingImageFallbackVariant,
  type ListingImageVariant,
} from '../../../../lib/listing-image-variants';
import { listingPhotoUri } from '../utils/listingPhotos';

type Props = {
  photo: string | null | undefined;
  variant: ListingImageVariant;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
};

/**
 * Listing image with thumb → medium → original fallback (matches web onError chain).
 */
export function ListingPhotoImage({
  photo,
  variant,
  style,
  resizeMode = 'cover',
}: Props): React.JSX.Element {
  const [stage, setStage] = useState<ListingImageVariant>(variant);

  useEffect(() => {
    setStage(variant);
  }, [photo, variant]);

  const uri = listingPhotoUri(photo, stage);

  const onError = useCallback(() => {
    if (!photo) return;
    const next = getNextListingImageFallbackVariant(variant, stage);
    if (next) {
      setStage(next);
    }
  }, [photo, variant, stage]);

  return (
    <Image source={{ uri }} style={style} resizeMode={resizeMode} onError={onError} />
  );
}
