import React, { useEffect, useState } from 'react';
import { Image, View, type ImageResizeMode } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/(utils)/image';

type AppImageProps = {
  // stored path ("uploads\product_images\x.webp") or a full URL
  path?: string | null;
  width?: number;
  height?: number;
  size?: number;
  radius?: number;
  resizeMode?: ImageResizeMode;
  bordered?: boolean;
};

// Product/category image with a grey placeholder when there is no image or
// it fails to load. Use this instead of building image URLs in screens.
export default function AppImage({
  path,
  size = 64,
  width = size,
  height = size,
  radius = 12,
  resizeMode = 'cover',
  bordered = false,
}: AppImageProps) {
  const uri = getImageUrl(path);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const frame = {
    width,
    height,
    borderRadius: radius,
    backgroundColor: '#F9FAFB',
    borderWidth: bordered ? 1 : 0,
    borderColor: '#E5E7EB',
    overflow: 'hidden' as const,
  };

  if (!uri || failed) {
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="image-outline" size={Math.max(16, Math.min(width, height) * 0.36)} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={frame}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
