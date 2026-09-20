'use client';

import Image, { type ImageProps } from 'next/image';
import { imageProps } from '@/lib/media';

export interface AdaptiveImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  alt: string;
}

/**
 * Client Component boundary for Next.js <Image> with Cloudinary loader.
 *
 * Prevents React 19 RSC serialization error (#441) when passing custom loader
 * functions from Server Components to Client Components across the RSC boundary.
 */
export default function AdaptiveImage({ src, alt, ...rest }: AdaptiveImageProps) {
  const mediaProps = imageProps(src);
  return <Image {...mediaProps} alt={alt} {...rest} />;
}
