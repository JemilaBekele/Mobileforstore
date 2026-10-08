import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ScrollView, YStack, Input, Button, Text, XStack, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/(redux)/hooks';
import { changePasswordAction, clearError } from '@/(redux)/authSlice';
import type { AppDispatch } from '@/(redux)/store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Labelled input with a leading icon; orange border when focused, red on error
const FormField = ({
  label,
  icon,
  error,
  editable = true,
  ...inputProps
}: {
  label: string;
  icon: IconName;
  error?: string;
  editable?: boolean;
} & React.ComponentProps<typeof Input>) => {
  const [focused, setFocused] = useState(false);
  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="600" color="#374151">
        {label}
      </Text>
      <XStack
        alignItems="center"
        backgroundColor={editable ? '#FFFFFF' : '#F9FAFB'}
        borderWidth={1}
        borderColor={error ? '#DC2626' : focused ? '#FF6B00' : '#E5E7EB'}
        borderRadius={12}
        paddingLeft={12}
      >
        <Ionicons name={icon} size={18} color="#6B7280" />
        <Input
          flex={1}
          {...inputProps}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          backgroundColor="transparent"
          borderWidth={0}
          focusStyle={{ borderWidth: 0 }}
          color="#111827"
          fontSize={15}
          paddingHorizontal={10}
          placeholderTextColor="#9CA3AF"
        />
      </XStack>
      {error ? (
        <Text fontSize={12} color="#DC2626">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
};

export default function PasswordChange() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Clear errors when component unmounts or when error changes
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const validateForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    let isValid = true;

    // Only basic validation for testing
    if (!formData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!formData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
      isValid = false;
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }
    try {
      await dispatch(changePasswordAction({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })).unwrap();

      // Success
      setShowSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setValidationErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      Alert.alert('Success', 'Password changed successfully!');

    } catch (error) {
      // Error is handled by the useEffect above
      console.error('Password change failed:', error);
    }
  };

  // Simplified validation - only check if all fields are filled and passwords match
  const isFormValid =
    formData.currentPassword.trim() &&
    formData.newPassword.trim() &&
    formData.confirmPassword.trim() &&
    formData.newPassword === formData.confirmPassword;

  const requirements = [
    { ok: !!formData.currentPassword, label: 'Current password entered' },
    { ok: !!formData.newPassword, label: 'New password entered' },
    { ok: formData.newPassword === formData.confirmPassword && !!formData.newPassword, label: 'Passwords match' },
  ];

  return (
    <ScrollView flex={1} backgroundColor="#FFFFFF">
      <YStack
        paddingHorizontal={16}
        paddingTop={16}
        paddingBottom={12}
        borderBottomWidth={1}
        borderBottomColor="#E5E7EB"
        gap={2}
      >
        <Text fontSize={24} fontWeight="700" color="#111827">
          Change Password
        </Text>
        <Text fontSize={14} color="#6B7280">
          Update your password (any password is allowed for testing)
        </Text>
      </YStack>

      <YStack flex={1} padding={16} gap={12}>
        {/* Success Message */}
        {showSuccess ? (
          <XStack
            alignItems="center"
            gap={8}
            padding={12}
            borderRadius={12}
            backgroundColor="#F0FDF4"
            borderWidth={1}
            borderColor="#BBF7D0"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#166534" />
            <Text color="#166534" fontWeight="600" fontSize={14}>
              Password changed successfully!
            </Text>
          </XStack>
        ) : null}

        <YStack backgroundColor="#FFFFFF" borderWidth={1} borderColor="#E5E7EB" borderRadius={16} padding={16} gap={14}>
          <FormField
            label="Current Password"
            icon="lock-closed-outline"
            secureTextEntry
            value={formData.currentPassword}
            onChangeText={(text) => handleInputChange('currentPassword', text)}
            error={validationErrors.currentPassword}
            placeholder="Enter your current password"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FormField
            label="New Password"
            icon="key-outline"
            secureTextEntry
            value={formData.newPassword}
            onChangeText={(text) => handleInputChange('newPassword', text)}
            error={validationErrors.newPassword}
            placeholder="Enter any new password (testing)"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FormField
            label="Confirm New Password"
            icon="key-outline"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            error={validationErrors.confirmPassword}
            placeholder="Confirm your new password"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Simple Requirements */}
          <YStack backgroundColor="#F9FAFB" borderRadius={12} padding={12} gap={6}>
            <Text fontSize={14} fontWeight="600" color="#111827">
              Basic requirements
            </Text>
            {requirements.map((req) => (
              <XStack key={req.label} alignItems="center" gap={8}>
                <Ionicons
                  name={req.ok ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={req.ok ? '#16A34A' : '#9CA3AF'}
                />
                <Text color="#374151" fontSize={13}>{req.label}</Text>
              </XStack>
            ))}
          </YStack>

          {/* Submit Button */}
          <Button
            backgroundColor="#FF6B00"
            borderWidth={0}
            borderRadius={12}
            opacity={isFormValid && !loading ? 1 : 0.6}
            pressStyle={{ backgroundColor: '#EA580C' }}
            onPress={handleChangePassword}
            disabled={!isFormValid || loading}
            height={50}
          >
            {loading ? (
              <XStack alignItems="center" gap={8}>
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="700">Changing Password...</Text>
              </XStack>
            ) : (
              <Text color="white" fontWeight="700">Change Password</Text>
            )}
          </Button>

          {/* Clear Button */}
          <Button
            backgroundColor="#FFFFFF"
            borderWidth={1}
            borderColor="#E5E7EB"
            borderRadius={12}
            pressStyle={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
            onPress={() => {
              setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              setValidationErrors({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
            }}
            disabled={loading}
          >
            <Text color="#111827" fontWeight="600">Clear Form</Text>
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
