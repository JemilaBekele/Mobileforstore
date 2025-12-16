import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ScrollView, YStack, H4, Card, Input, Fieldset, Label, Button, Text, XStack, Spinner } from 'tamagui';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/(redux)/hooks';
import { changePasswordAction, clearError } from '@/(redux)/authSlice';
import type { AppDispatch } from '@/(redux)/store';

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

  return (
    <ScrollView flex={1} backgroundColor="$orange1">
      <YStack flex={1} padding="$4" space="$4">
        <H4 color="$orange12" marginBottom="$2">
          Change Password
        </H4>

        <Text fontSize="$3" color="$orange10" marginBottom="$4">
          Update your password (any password is allowed for testing)
        </Text>

        {/* Success Message */}
        {showSuccess && (
          <Card backgroundColor="$green2" borderColor="$green6" padding="$3" marginBottom="$4">
            <XStack alignItems="center" space="$2">
              <Text color="$green11" fontSize="$4">✅</Text>
              <Text color="$green11" fontWeight="600" fontSize="$3">
                Password changed successfully!
              </Text>
            </XStack>
          </Card>
        )}

        <Card elevate bordered padding="$4" backgroundColor="$orange1">
          <YStack space="$4">
            {/* Current Password */}
            <Fieldset>
              <Label htmlFor="currentPassword" color="$orange11" fontSize="$4">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                secureTextEntry
                value={formData.currentPassword}
                onChangeText={(text) => handleInputChange('currentPassword', text)}
                borderColor={validationErrors.currentPassword ? "$red8" : "$orange5"}
                backgroundColor="$orange1"
                placeholder="Enter your current password"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {validationErrors.currentPassword && (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.currentPassword}
                </Text>
              )}
            </Fieldset>

            {/* New Password */}
            <Fieldset>
              <Label htmlFor="newPassword" color="$orange11" fontSize="$4">
                New Password
              </Label>
              <Input
                id="newPassword"
                secureTextEntry
                value={formData.newPassword}
                onChangeText={(text) => handleInputChange('newPassword', text)}
                borderColor={validationErrors.newPassword ? "$red8" : "$orange5"}
                backgroundColor="$orange1"
                placeholder="Enter any new password (testing)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {validationErrors.newPassword && (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.newPassword}
                </Text>
              )}
            </Fieldset>

            {/* Confirm Password */}
            <Fieldset>
              <Label htmlFor="confirmPassword" color="$orange11" fontSize="$4">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                borderColor={validationErrors.confirmPassword ? "$red8" : "$orange5"}
                backgroundColor="$orange1"
                placeholder="Confirm your new password"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {validationErrors.confirmPassword && (
                <Text color="$red10" fontSize="$2" marginTop="$2">
                  {validationErrors.confirmPassword}
                </Text>
              )}
            </Fieldset>

            {/* Simple Requirements */}
            <Card backgroundColor="$orange2" padding="$3" borderRadius="$3">
              <Text fontSize="$3" fontWeight="600" color="$orange11" marginBottom="$2">
                Basic Requirements:
              </Text>
              <YStack space="$1">
                <XStack alignItems="center" space="$2">
                  <Text color={formData.currentPassword ? "$green9" : "$orange8"} fontSize="$2">
                    {formData.currentPassword ? "✓" : "○"}
                  </Text>
                  <Text color="$orange10" fontSize="$2">Current password entered</Text>
                </XStack>
                <XStack alignItems="center" space="$2">
                  <Text color={formData.newPassword ? "$green9" : "$orange8"} fontSize="$2">
                    {formData.newPassword ? "✓" : "○"}
                  </Text>
                  <Text color="$orange10" fontSize="$2">New password entered</Text>
                </XStack>
                <XStack alignItems="center" space="$2">
                  <Text color={formData.newPassword === formData.confirmPassword && formData.newPassword ? "$green9" : "$orange8"} fontSize="$2">
                    {formData.newPassword === formData.confirmPassword && formData.newPassword ? "✓" : "○"}
                  </Text>
                  <Text color="$orange10" fontSize="$2">Passwords match</Text>
                </XStack>
              </YStack>
            </Card>

            {/* Submit Button */}
            <Button
              backgroundColor={isFormValid ? "$orange9" : "$orange5"}
              borderColor={isFormValid ? "$orange10" : "$orange6"}
              borderWidth={1}
              borderRadius="$4"
              onPress={handleChangePassword}
              disabled={!isFormValid || loading}
              height="$5"
            >
              {loading ? (
                <XStack alignItems="center" space="$2">
                  <Spinner size="small" color="white" />
                  <Text color="white" fontWeight="600">Changing Password...</Text>
                </XStack>
              ) : (
                <Text color="white" fontWeight="600">Change Password</Text>
              )}
            </Button>

            {/* Clear Button */}
            <Button
              variant="outlined"
              borderColor="$orange6"
              backgroundColor="transparent"
              borderRadius="$4"
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
              <Text color="$orange11" fontWeight="600">Clear Form</Text>
            </Button>
          </YStack>
        </Card>

        {/* Testing Notice */}
        <Card backgroundColor="$blue2" borderColor="$blue6" padding="$4" marginTop="$4">
          <YStack space="$2">
            <Text fontSize="$4" fontWeight="700" color="$blue11">
              🧪 Testing Mode
            </Text>
            <Text fontSize="$2" color="$blue10">
              • Any password is allowed (no complexity requirements)
            </Text>
            <Text fontSize="$2" color="$blue10">
              • Minimum 1 character passwords work
            </Text>
            <Text fontSize="$2" color="$blue10">
              • Same as current password is allowed
            </Text>
            <Text fontSize="$2" color="$blue10" fontStyle="italic">
              This is for testing purposes only
            </Text>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}