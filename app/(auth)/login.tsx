// app/(auth)/login.tsx
import React, { useState, useRef } from "react";
import { Image, KeyboardAvoidingView, Platform } from "react-native";
import { Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/(redux)/store";
import { login } from "@/(redux)/authSlice";
import { 
  Card, 
  Text, 
  XStack, 
  YStack, 
  Button, 
  Input, 
  ScrollView,
  Spinner,
} from 'tamagui';

const loginImage = require('@/assets/images/loginn.jpg');

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const formikRef = useRef<FormikProps<{ email: string; password: string }>>(null);
  
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setMessage("");
    setIsLoading(true);
    setMessageType("pending");
    
    try {
      await dispatch(login(values)).unwrap();
      setMessage("Login successful!");
      setMessageType("success");
      
      setTimeout(() => {
        router.replace("/(tabs)" as any);
      }, 1000);
      
    } catch (error: any) {
      setMessage(error || "Invalid email or password. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setMessage("Forgot password feature coming soon!");
    setMessageType("info");
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case "error":
        return { bg: "$red3", borderColor: "$red8", color: "$red11" };
      case "success":
        return { bg: "$green3", borderColor: "$green8", color: "$green11" };
      case "info":
        return { bg: "$blue3", borderColor: "$blue8", color: "$blue11" };
      default:
        return { bg: "$gray3", borderColor: "$gray8", color: "$gray11" };
    }
  };

  const messageStyles = getMessageStyles();

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: "center" 
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack flex={1} justifyContent="center" padding="$4" space="$4">
          {/* Header */}
          <YStack alignItems="center" marginBottom="$4" space="$3">
            <Image 
              source={loginImage} 
              style={{ 
                width: 180, 
                height: 180, 
                resizeMode: "contain",
              }} 
            />
            <Text fontSize="$9" fontWeight="bold" color="$gray12">
              Stock Management
            </Text>
          </YStack>

          {/* Login Card */}
          <Card 
            elevate 
            size="$4" 
            bordered 
            backgroundColor="$background"
            shadowColor="$shadowColor"
            shadowRadius="$4"
            borderRadius="$4"
          >
            <Card.Header padded>
              <Text fontSize="$7" fontWeight="bold" color="$gray12" marginBottom="$2">
                Login
              </Text>
              
              {/* Message Display */}
              {message && (
                <YStack 
                  padding="$3" 
                  borderRadius="$3" 
                  marginBottom="$3"
                  backgroundColor={messageStyles.bg}
                  borderColor={messageStyles.borderColor}
                  borderWidth="$0.5"
                >
                  <Text 
                    textAlign="center" 
                    fontSize="$3" 
                    color={messageStyles.color}
                  >
                    {message}
                  </Text>
                </YStack>
              )}

              <Formik
                innerRef={formikRef}
                initialValues={{ email: "", password: "" }}
                validationSchema={LoginSchema}
                onSubmit={handleLogin}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                  isValid,
                  dirty,
                }) => (
                  <YStack space="$3">
                    {/* Email Input */}
                    <YStack space="$2">
                      <Input
                        placeholder="Enter your email"
                        value={values.email}
                        onChangeText={handleChange("email")}
                        onBlur={handleBlur("email")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        borderColor={errors.email && touched.email ? "$red8" : "$borderColor"}
                        backgroundColor="$background"
                        size="$4"
                        placeholderTextColor="$gray10"
                      />
                      {errors.email && touched.email && (
                        <Text fontSize="$2" color="$red10" marginLeft="$2">
                          {errors.email}
                        </Text>
                      )}
                    </YStack>

                    {/* Password Input */}
                    <YStack space="$2">
                      <Input
                        placeholder="Enter your password"
                        value={values.password}
                        onChangeText={handleChange("password")}
                        onBlur={handleBlur("password")}
                        secureTextEntry
                        autoCapitalize="none"
                        borderColor={errors.password && touched.password ? "$red8" : "$borderColor"}
                        backgroundColor="$background"
                        size="$4"
                        placeholderTextColor="$gray10"
                      />
                      {errors.password && touched.password && (
                        <Text fontSize="$2" color="$red10" marginLeft="$2">
                          {errors.password}
                        </Text>
                      )}
                    </YStack>

                    {/* Forgot Password */}
                    <XStack justifyContent="flex-end" marginTop="$2">
                      <Button 
                        unstyled 
                        onPress={handleForgotPassword}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        <Text color="$blue10" fontSize="$3">
                          Forgot Password?
                        </Text>
                      </Button>
                    </XStack>

                    {/* Login Button */}
                    <Button
                      onPress={() => handleSubmit()}
                      disabled={!isValid || !dirty || isLoading}
                      opacity={(!isValid || !dirty || isLoading) ? 0.6 : 1}
                      backgroundColor="$blue10"
                      borderColor="$blue8"
                      size="$4"
                      marginTop="$2"
                      icon={isLoading ? () => <Spinner size="small" color="$color" /> : undefined}
                    >
                      {isLoading ? (
                        <Text color="$color">
                          Signing in...
                        </Text>
                      ) : (
                        <Text color="$color" fontWeight="600">
                          Login
                        </Text>
                      )}
                    </Button>
                  </YStack>
                )}
              </Formik>
            </Card.Header>
          </Card>

          {/* Footer */}
          <YStack alignItems="center" marginTop="$4">
            <Text color="$gray9" fontSize="$2">
              Stock Management System
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}