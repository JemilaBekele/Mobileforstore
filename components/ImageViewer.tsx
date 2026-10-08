import React from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ImageViewerProps = {
  uri?: string;
  title?: string;
  visible: boolean;
  onClose: () => void;
};

// Full-screen view of one image on a dark background; tap anywhere, the
// close button or Android back to dismiss.
export default function ImageViewer({ uri, title, visible, onClose }: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible && !!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.92)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
        ) : null}
        {title ? (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              marginTop: 12,
              paddingHorizontal: 24,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        ) : null}
        <View style={{ position: 'absolute', top: insets.top + 12, right: 16 }}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close image"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
