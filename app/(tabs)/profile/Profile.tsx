import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  ScrollView,
  YStack,
  H4,
  Card,
  Input,
  Fieldset,
  Label,
  Button,
  Text,
  XStack,
  Spinner
} from 'tamagui';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/(redux)/hooks';
import { updateUserByIdAction, clearError } from '@/(redux)/authSlice';
import type { AppDispatch } from '@/(redux)/store';

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
    <ScrollView flex={1} backgroundColor="$orange1">
      <YStack flex={1} padding="$4" space="$4">
        <YStack space="$1" marginBottom="$2">
          <H4 color="$orange12" fontWeight="800">
            Account Information
          </H4>
          <YStack width={40} height={3} borderRadius={2} backgroundColor="$orange9" />
          <Text fontSize="$3" color="$orange11" marginTop="$2">
            Update your personal information
          </Text>
        </YStack>

        {/* Success Message */}
        {showSuccess && (
          <Card backgroundColor="$green2" borderColor="$green6" borderWidth={1} borderRadius="$4" padding="$3" marginBottom="$4">
            <XStack alignItems="center" space="$2">
              <Text color="$green11" fontSize="$4">✅</Text>
              <Text color="$green11" fontWeight="600" fontSize="$3">
                Profile updated successfully!
              </Text>
            </XStack>
          </Card>
        )}

        <Card bordered borderWidth={1} borderColor="$orange4" borderRadius="$5" padding="$4" backgroundColor="$orange1">
          <YStack space="$4">
            {/* Name Field */}
            <Fieldset>
              <Label htmlFor="name" color="$orange11" fontSize="$3" fontWeight="600">
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                borderColor={validationErrors.name ? "$red8" : "$orange4"}
                focusStyle={{ borderColor: validationErrors.name ? "$red8" : "$orange9" }}
                backgroundColor={isEditing ? "$orange1" : "$orange2"}
                color="$orange12"
                borderRadius="$4"
                placeholder="Enter your full name"
                editable={isEditing}
              />
              {validationErrors.name ? (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.name}
                </Text>
              ) : null}
            </Fieldset>

            {/* Email Field */}
            <Fieldset>
              <Label htmlFor="email" color="$orange11" fontSize="$3" fontWeight="600">
                Email Address *
              </Label>
              <Input
                id="email"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                borderColor={validationErrors.email ? "$red8" : "$orange4"}
                focusStyle={{ borderColor: validationErrors.email ? "$red8" : "$orange9" }}
                backgroundColor={isEditing ? "$orange1" : "$orange2"}
                color="$orange12"
                borderRadius="$4"
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={isEditing}
              />
              {validationErrors.email ? (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.email}
                </Text>
              ) : null}
            </Fieldset>

            {/* Phone Field */}
            <Fieldset>
              <Label htmlFor="phone" color="$orange11" fontSize="$3" fontWeight="600">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                borderColor={validationErrors.phone ? "$red8" : "$orange4"}
                focusStyle={{ borderColor: validationErrors.phone ? "$red8" : "$orange9" }}
                backgroundColor={isEditing ? "$orange1" : "$orange2"}
                color="$orange12"
                borderRadius="$4"
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                editable={isEditing}
              />
              {validationErrors.phone ? (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.phone}
                </Text>
              ) : null}
            </Fieldset>

            {/* Read-only Information */}
            {!isEditing && (
              <YStack space="$3" marginTop="$2">
                <Card backgroundColor="$orange2" padding="$3" borderRadius="$4">
                  <YStack space="$2">

                    <XStack justifyContent="space-between">
                      <Text color="$orange11" fontSize="$3">Role:</Text>
                      <Text color="$orange12" fontSize="$3" fontWeight="500">
                        {roleValue}
                      </Text>
                    </XStack>
                    <XStack justifyContent="space-between">
                      <Text color="$orange11" fontSize="$3">Branch:</Text>
                      <Text color="$orange12" fontSize="$3" fontWeight="500">
                        {branchValue}
                      </Text>
                    </XStack>
                    {/* <XStack justifyContent="space-between">
                      <Text color="$orange11" fontSize="$3">Status:</Text>
                      <Text color="$orange12" fontSize="$3" fontWeight="500">
                        {user?.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                      </Text>
                    </XStack> */}
                  </YStack>
                </Card>
              </YStack>
            )}

            {/* Action Buttons */}
            {isEditing ? (
              <XStack space="$3" marginTop="$2">
                <Button
                  flex={1}
                  backgroundColor="$orange9"
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: "$orange10" }}
                  onPress={handleUpdate}
                  disabled={!isFormValid || !hasChanges || loading}
                  opacity={!isFormValid || !hasChanges || loading ? 0.6 : 1}
                >
                  {loading ? (
                    <XStack alignItems="center" space="$2">
                      <Spinner size="small" color="white" />
                      <Text color="white" fontWeight="600">Updating...</Text>
                    </XStack>
                  ) : (
                    <Text color="white" fontWeight="600">Save Changes</Text>
                  )}
                </Button>
                <Button
                  flex={1}
                  variant="outlined"
                  borderColor="$orange9"
                  borderWidth={1}
                  borderRadius="$4"
                  backgroundColor="$orange1"
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text color="$orange9" fontWeight="700">Cancel</Text>
                </Button>
              </XStack>
            ) : (
              <Button
                backgroundColor="$orange9"
                borderRadius="$4"
                pressStyle={{ backgroundColor: "$orange10" }}
                onPress={() => setIsEditing(true)}
                marginTop="$2"
              >
                <Text color="white" fontWeight="700">Edit Profile</Text>
              </Button>
            )}
          </YStack>
        </Card>

        {/* Form Status */}
        {isEditing && (
          <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} borderRadius="$4" padding="$3">
            <YStack space="$1">
              <Text fontSize="$3" fontWeight="600" color="$orange12">
                Form Status:
              </Text>
              <XStack alignItems="center" space="$2">
                <Text color={isFormValid ? "$green9" : "$orange9"} fontSize="$2">
                  {isFormValid ? "✓" : "○"}
                </Text>
                <Text color="$orange11" fontSize="$2">All required fields are valid</Text>
              </XStack>
              <XStack alignItems="center" space="$2">
                <Text color={hasChanges ? "$green9" : "$orange9"} fontSize="$2">
                  {hasChanges ? "✓" : "○"}
                </Text>
                <Text color="$orange11" fontSize="$2">Changes made to form</Text>
              </XStack>
            </YStack>
          </Card>
        )}

        {/* User Information Note */}
        <Card backgroundColor="$orange2" borderRadius="$4" padding="$3">
          <Text fontSize="$2" color="$orange11" textAlign="center">
            * Required fields. Only name, email, and phone can be updated. Other information is managed by administrators.
          </Text>
        </Card>
      </YStack>
    </ScrollView>
  );
}