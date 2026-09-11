import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

export default function SelfieCameraModal({ visible, onClose, onConfirm, actionType = 'IN' }) {
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible && !capturedPhoto) {
      launchFrontCamera();
    }
  }, [visible]);

  const launchFrontCamera = async () => {
    try {
      setIsProcessing(true);

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Camera access is required to take a selfie photo.');
        setIsProcessing(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Compress and resize image to lightweight ~200KB JPEG
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 600 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        setCapturedPhoto({
          uri: manipulated.uri,
          base64: `data:image/jpeg;base64,${manipulated.base64 || asset.base64}`,
        });
      }
    } catch (error) {
      console.error('[SelfieCameraModal] Camera error:', error);
      Alert.alert('Camera Error', 'Could not open front camera. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    launchFrontCamera();
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onConfirm(capturedPhoto);
      setCapturedPhoto(null);
    }
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {actionType === 'IN' ? 'Punch In Face Verification' : 'Punch Out Face Verification'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {isProcessing && !capturedPhoto ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Opening Front Camera...</Text>
          </View>
        ) : capturedPhoto ? (
          /* Preview Mode */
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
            
            <View style={styles.instructionBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.instructionText}>Face Photo Captured</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh-outline" size={20} color="#FFF" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.confirmBtnText}>Confirm & Punch</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Open Camera Fallback Screen */
          <View style={styles.centerContent}>
            <Ionicons name="camera-outline" size={64} color="#6366F1" />
            <Text style={styles.readyTitle}>Face Verification</Text>
            <Text style={styles.readySub}>
              Complete front-camera face verification for attendance punch.
            </Text>
            <TouchableOpacity style={styles.launchBtn} onPress={launchFrontCamera}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.launchBtnText}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  readyTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  readySub: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  launchBtn: {
    marginTop: 28,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  launchBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  instructionBanner: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsRow: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retakeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
