import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ScrollView, YStack, Input, Button, Text, XStack, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/(redux)/hooks';
import { updateUserByIdAction, clearError } from '@/(redux)/authSlice';
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

export default function ProfileInfo() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

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
      name: '',
      email: '',
      phone: '',
    };

    let isValid = true;

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
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

  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    try {
      // Prepare update data - only include name, email, and phone fields
      const updatedData: Record<string, any> = {};

      if (formData.name !== user.name) updatedData.name = formData.name;
      if (formData.email !== user.email) updatedData.email = formData.email;
      if (formData.phone !== user.phone) updatedData.phone = formData.phone;

      // Only make API call if there are changes
      if (Object.keys(updatedData).length > 0) {
        await dispatch(updateUserByIdAction({
          userID: user.id,
          updatedData,
        })).unwrap();

        // Success
        setShowSuccess(true);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Info', 'No changes made to the profile');
        setIsEditing(false);
      }

    } catch (error) {
      // Error is handled by the useEffect above
      console.error('Profile update failed:', error);
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    setValidationErrors({
      name: '',
      email: '',
      phone: '',
    });
    setIsEditing(false);
  };

  const hasChanges =
    formData.name !== user?.name ||
    formData.email !== user?.email ||
    formData.phone !== user?.phone;

  // role / branch can come as a string or as an object with a name
  const role: any = user?.role;
  const branch: any = user?.branch;
  const roleValue = typeof role === 'string' ? role : role?.name || 'N/A';
  const branchValue = typeof branch === 'string' ? branch : branch?.name || 'N/A';

  const isFormValid =
    formData.name.trim() &&
    formData.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

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
          Account Information
        </Text>
        <Text fontSize={14} color="#6B7280">
          Update your personal information
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
              Profile updated successfully!
            </Text>
          </XStack>
        ) : null}

        <YStack backgroundColor="#FFFFFF" borderWidth={1} borderColor="#E5E7EB" borderRadius={16} padding={16} gap={14}>
          <FormField
            label="Full Name *"
            icon="person-outline"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            error={validationErrors.name}
            placeholder="Enter your full name"
            editable={isEditing}
          />

          <FormField
            label="Email Address *"
            icon="mail-outline"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            error={validationErrors.email}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={isEditing}
          />

          <FormField
            label="Phone Number"
            icon="call-outline"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            error={validationErrors.phone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            editable={isEditing}
          />

          {/* Read-only Information */}
          {!isEditing ? (
            <YStack borderTopWidth={1} borderTopColor="#F3F4F6">
              <XStack justifyContent="space-between" alignItems="center" paddingVertical={10}>
                <Text color="#6B7280" fontSize={14}>Role</Text>
                <Text color="#111827" fontSize={14} fontWeight="600">
                  {roleValue}
                </Text>
              </XStack>
              <YStack height={1} backgroundColor="#F3F4F6" />
              <XStack justifyContent="space-between" alignItems="center" paddingVertical={10}>
                <Text color="#6B7280" fontSize={14}>Branch</Text>
                <Text color="#111827" fontSize={14} fontWeight="600">
                  {branchValue}
                </Text>
              </XStack>
            </YStack>
          ) : null}

          {/* Action Buttons */}
          {isEditing ? (
            <XStack gap={12}>
              <Button
                flex={1}
                backgroundColor="#FFFFFF"
                borderWidth={1}
                borderColor="#E5E7EB"
                borderRadius={12}
                pressStyle={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text color="#111827" fontWeight="600">Cancel</Text>
              </Button>
              <Button
                flex={1}
                backgroundColor="#FF6B00"
                borderWidth={0}
                borderRadius={12}
                pressStyle={{ backgroundColor: '#EA580C' }}
                onPress={handleUpdate}
                disabled={!isFormValid || !hasChanges || loading}
                opacity={!isFormValid || !hasChanges || loading ? 0.6 : 1}
              >
                {loading ? (
                  <XStack alignItems="center" gap={8}>
                    <Spinner size="small" color="white" />
                    <Text color="white" fontWeight="700">Updating...</Text>
                  </XStack>
                ) : (
                  <Text color="white" fontWeight="700">Save Changes</Text>
                )}
              </Button>
            </XStack>
          ) : (
            <Button
              backgroundColor="#FF6B00"
              borderWidth={0}
              borderRadius={12}
              pressStyle={{ backgroundColor: '#EA580C' }}
              onPress={() => setIsEditing(true)}
              icon={<Ionicons name="create-outline" size={18} color="white" />}
            >
              <Text color="white" fontWeight="700">Edit Profile</Text>
            </Button>
          )}
        </YStack>

        {/* Form Status */}
        {isEditing ? (
          <YStack backgroundColor="#FFFFFF" borderWidth={1} borderColor="#E5E7EB" borderRadius={12} padding={12} gap={6}>
            <Text fontSize={14} fontWeight="600" color="#111827">
              Form status
            </Text>
            <XStack alignItems="center" gap={8}>
              <Ionicons
                name={isFormValid ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isFormValid ? '#16A34A' : '#9CA3AF'}
              />
              <Text color="#374151" fontSize={13}>All required fields are valid</Text>
            </XStack>
            <XStack alignItems="center" gap={8}>
              <Ionicons
                name={hasChanges ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasChanges ? '#16A34A' : '#9CA3AF'}
              />
              <Text color="#374151" fontSize={13}>Changes made to form</Text>
            </XStack>
          </YStack>
        ) : null}

        {/* User Information Note */}
        <XStack gap={8} alignItems="flex-start" paddingHorizontal={4}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text flex={1} fontSize={12} color="#6B7280">
            * Required fields. Only name, email, and phone can be updated. Other information is managed by administrators.
          </Text>
        </XStack>
      </YStack>
    </ScrollView>
  );
}
