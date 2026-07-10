import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import {
  getRazorpayOrderUrl,
  getRazorpayVerifyUrl,
  getSiteDataUrl,
} from '../config'; // Assuming config is in same directory
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from 'expo-router';
const { width, height } = Dimensions.get('window');

export default function RechargeScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    details: '',
  });
    const { user, getSlug, getSiteName, getSiteId, logout } = useAuth();
const [siteInfo, setSiteInfo] = useState({
    siteName: null,
    siteId: null,
    slug: null,
    user: null,
  });
    const [isLoadingSiteInfo, setIsLoadingSiteInfo] = useState(true);
  const customAmountInputRef = useRef(null);


   const loadSiteInfo = async () => {
  try {
    const userData = await AsyncStorage.getItem("userData");

    if (userData) {
      const parsed = JSON.parse(userData);
      return {
        siteName: parsed.site_name,
        siteId: parsed.site_id,
        slug: parsed.slug,
        user: parsed,
      };
    }

    return { siteName: null, siteId: null, slug: null, user: null };
  } catch {
    return { siteName: null, siteId: null, slug: null, user: null };
  }
};
  // Fetch site data on component mount
 useEffect(() => {
  const loadInitialData = async () => {
    try {
      setIsLoadingSiteInfo(true);

      // 🔹 Priority 1: AuthContext
      const authSlug = getSlug();
      const authSiteName = getSiteName();
      const authSiteId = getSiteId();

      if (authSiteId && authSiteName) {
        setSiteInfo({
          siteName: authSiteName,
          siteId: authSiteId,
          slug: authSlug,
          user: user,
        });
        return;
      }

      // 🔹 Priority 2: AsyncStorage
      const stored = await loadSiteInfo();
      if (stored.siteName || stored.slug) {
        setSiteInfo(stored);
      } else {
        setSiteError("No site information found");
      }

    } catch {
      setSiteError("Error loading site information");
    } finally {
      setIsLoadingSiteInfo(false);
    }
  };

  loadInitialData();
}, [user]);



useEffect(() => {
  if (siteInfo.siteName || siteInfo.slug) {
    fetchSiteData();
  }
}, [siteInfo]);

useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    if (siteInfo.siteName || siteInfo.slug) {
      fetchSiteData();
    }
  });

  return unsubscribe;
}, [navigation, siteInfo]);

const fetchSiteData = async () => {
  try {
    setSiteLoading(true);
    setSiteError(null);

    const slugToUse = siteInfo.slug || siteInfo.siteName;
    if (!slugToUse) return;

    const response = await fetch(getSiteDataUrl(slugToUse));
    const data = await response.json();

    if (data.success) {
      setSiteData(data.asset_information);
    } else {
      setSiteError("Failed to load site data");
    }
  } catch (error) {
    setSiteError("Network error");
  } finally {
    setSiteLoading(false);
  }
};


  // Customer details from API
 const rawBalance = Number(siteData?.electric_parameters?.balance);

const customerDetails = {
  accountId: siteData?.slug || '—',
  name: siteData?.custom_name || 'Loading...',
  meterNo: siteData?.site_name || 'Loading...',
  availableBalance: `₹${
    isNaN(rawBalance) ? "0.00" : rawBalance.toFixed(2)
  }`,
  shopName: siteData?.meter_name || 'Loading...',
  address: siteData?.location || 'Loading...',
};


  const rechargeOptions = [
    { 
      amount: 1000, 
      description: 'Quick Top-up', 
      icon: '⚡', 
      tag: 'Popular',
      color: '#4f46e5',
      bgColor: '#f5f3ff'
    },
    { 
      amount: 2000, 
      description: 'Daily Use', 
      icon: '☀️',
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    { 
      amount: 3000, 
      description: 'Weekly Pack', 
      icon: '📅', 
      tag: 'Value',
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    { 
      amount: 4000, 
      description: 'Monthly Pack', 
      icon: '📊',
      color: '#0ea5e9',
      bgColor: '#e0f2fe'
    },
    { 
      amount: 5000, 
      description: 'Family Pack', 
      icon: '👨‍👩‍👧‍👦', 
      tag: 'Best',
      color: '#8b5cf6',
      bgColor: '#f5f3ff'
    },
    { 
      amount: 10000, 
      description: 'Heavy Usage', 
      icon: '🏭',
      color: '#ef4444',
      bgColor: '#fee2e2'
    },
  ];

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card', color: '#4f46e5' },
    { id: 'upi', name: 'UPI', icon: 'smartphone', color: '#0ea5e9' },
    { id: 'wallet', name: 'Wallet', icon: 'account-balance-wallet', color: '#10b981' },
    { id: 'netbanking', name: 'Net Banking', icon: 'account-balance', color: '#f59e0b' },
  ];

  const quickAmounts = [
    { amount: 500, color: '#f0f9ff' },
    { amount: 1000, color: '#f5f3ff' },
    { amount: 2000, color: '#fef2f2' },
    { amount: 5000, color: '#f0fdf4' },
  ];
  const SERVICE_FEE = 10;
  const PLATFORM_FEE = 1.8;
  const baseRechargeAmount = selectedAmount || parseFloat(customAmount) || 0;
  const payableAmount = Number((baseRechargeAmount + SERVICE_FEE + PLATFORM_FEE).toFixed(2));

  const showPaymentStatus = (type, title, message, details = '') => {
    setPaymentStatus({
      visible: true,
      type,
      title,
      message,
      details,
    });
  };

  const hidePaymentStatus = () => {
    setPaymentStatus((prev) => ({ ...prev, visible: false }));
  };

  const buildIdempotencyKey = () => {
    const sitePart = siteInfo.siteId || siteInfo.slug || 'site';
    return `TXN-${sitePart}-${Date.now()}`;
  };

  const getAuthHeaders = async (idempotencyKey?: string) => {
    const authToken = await AsyncStorage.getItem("authToken");
    const userData = await AsyncStorage.getItem("userData");
    let parsedUserData = null;

    try {
      parsedUserData = userData ? JSON.parse(userData) : null;
    } catch {
      parsedUserData = null;
    }

    const resolvedToken =
      (authToken && authToken.length > 10) ? authToken : (
      parsedUserData?.auth_token ||
      parsedUserData?.token ||
      parsedUserData?.access_token ||
      parsedUserData?.bearer_token ||
      parsedUserData?.api_token ||
      parsedUserData?.site?.token ||
      parsedUserData?.site?.access_token ||
      parsedUserData?.site?.bearer_token ||
      parsedUserData?.site?.api_token ||
      ""
    );

    const authorizationValue = resolvedToken
      ? resolvedToken.startsWith("Bearer ")
        ? resolvedToken
        : `Bearer ${resolvedToken}`
      : undefined;

    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(authorizationValue ? { Authorization: authorizationValue } : {}),
    };
  };

  const getReadablePaymentError = (error) => {
    if (error?.code === 2) {
      return {
        title: 'Payment Cancelled',
        message: 'You closed the payment window before completing the recharge.',
        details: 'No amount was charged. You can try again anytime.',
      };
    }

    const rawDescription = error?.description;
    let parsedError = null;

    if (typeof rawDescription === 'string') {
      try {
        const cleaned = rawDescription.replace(/^[^{]*/, '');
        parsedError = JSON.parse(cleaned);
      } catch {
        parsedError = null;
      }
    } else if (typeof rawDescription === 'object' && rawDescription) {
      parsedError = rawDescription;
    }

    const reason =
      parsedError?.error?.reason ||
      parsedError?.reason ||
      error?.reason ||
      '';

    const step =
      parsedError?.error?.step ||
      parsedError?.step ||
      '';

    if (reason === 'payment_error' || step === 'payment_authentication') {
      return {
        title: 'Payment Could Not Be Completed',
        message: 'The bank or payment app did not complete authentication for this transaction.',
        details: 'Please try another UPI app, card, or retry after a moment.',
      };
    }

    if (error?.code === 'BAD_REQUEST_ERROR') {
      return {
        title: 'Payment Request Failed',
        message: 'The payment request could not be processed right now.',
        details: 'Please verify the amount and try again in a few moments.',
      };
    }

    return {
      title: 'Payment Failed',
      message: 'We could not complete your recharge this time.',
      details: 'Please try again, or use a different payment method.',
    };
  };

  const getFriendlyServerPaymentError = (rawMessage) => {
    const normalizedMessage = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';

    if (
      normalizedMessage.includes('sqlstate') ||
      normalizedMessage.includes('incorrect integer value') ||
      normalizedMessage.includes('insert into') ||
      normalizedMessage.includes('connection: mysql')
    ) {
      return {
        title: 'Recharge Could Not Be Saved',
        message: 'Your payment request reached the server, but the recharge could not be recorded properly.',
        details: 'This looks like a server issue. Please wait a moment and try again. If money was deducted, contact support with the payment time and amount.',
      };
    }

    if (
      normalizedMessage.includes('server has a configuration issue') ||
      normalizedMessage.includes('syntax error') ||
      normalizedMessage.includes('unexpected token') ||
      normalizedMessage.includes('<!doctype html') ||
      normalizedMessage.includes('<html')
    ) {
      return {
        title: 'Server Issue',
        message: 'The payment server is facing a temporary problem right now.',
        details: 'Please try again after some time. If the issue continues, contact support.',
      };
    }

    if (
      normalizedMessage.includes('network error') ||
      normalizedMessage.includes('network request failed') ||
      normalizedMessage.includes('failed to fetch')
    ) {
      return {
        title: 'Network Problem',
        message: 'We could not reach the payment server.',
        details: 'Please check your internet connection and try again.',
      };
    }

    return {
      title: 'Payment Failed',
      message: 'We could not process your recharge right now.',
      details: 'Please try again in a moment. If the problem continues, contact support.',
    };
  };

  const isServerSyntaxError = (value) => {
    if (typeof value !== 'string') {
      return false;
    }

    const normalizedValue = value.toLowerCase();
    return (
      normalizedValue.includes('syntax error') ||
      normalizedValue.includes('unexpected token') ||
      normalizedValue.includes('<!doctype html') ||
      normalizedValue.includes('<html')
    );
  };

  const parseApiError = async (response) => {
    try {
      const responseText = await response.text();
      let parsedData = null;

      try {
        parsedData = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsedData = null;
      }

      const message =
        parsedData?.message ||
        parsedData?.error ||
        parsedData?.details ||
        responseText;

      if (isServerSyntaxError(message)) {
        console.log('Payment API returned a server syntax error:', message);
        return 'The payment server has a configuration issue right now. Please try again later.';
      }

      return message || `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  };

  const shouldRetryOrderWithAlternateAmount = (message) => {
    if (typeof message !== "string") return false;
    const normalizedMessage = message.toLowerCase();
    return (
      normalizedMessage.includes("amount must be an integer") ||
      normalizedMessage.includes("amount should be an integer")
    );
  };

  const syncPaymentStatus = async ({
    idempotencyKey,
    orderData,
    amount,
    displayAmount,
    razorpayResult,
    status,
    razorpayDisplayStatus,
    errorMessage,
  }) => {
    if (!orderData?.order_id) {
      return;
    }

    await fetch(getRazorpayVerifyUrl(), {
      method: "POST",
      headers: await getAuthHeaders(idempotencyKey),
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        transaction_id: orderData.transaction_id,
        order_id: orderData.order_id,
        razorpay_order_id: razorpayResult?.razorpay_order_id || orderData.order_id,
        razorpay_payment_id: razorpayResult?.razorpay_payment_id || null,
        payment_id: razorpayResult?.razorpay_payment_id || null,
        razorpay_signature: razorpayResult?.razorpay_signature || null,
        amount,
        display_amount: displayAmount ?? null,
        status,
        payment_status: status,
        razorpay_status: razorpayDisplayStatus || status,
        display_status: razorpayDisplayStatus || status,
        failure_reason: errorMessage || null,
        reason: errorMessage || null,
        error_message: errorMessage || null,
        site_id: siteInfo.siteId,
        slug: siteInfo.slug,
      }),
    });
  };


 

  /* -------------------- PAYMENT -------------------- */

  

  const handlePayment = async () => {
  let amountToPay = selectedAmount;

  if (customAmount && parseFloat(customAmount) >= 1) {
    amountToPay = parseFloat(customAmount);
  }

  if (!amountToPay || amountToPay < 1) {
    showPaymentStatus('warning', 'Invalid Amount ⚠️', 'Please select or enter minimum ₹1. 😊');
    return;
  }

  if (amountToPay > 100000) {
    return;
  }

  setLoading(true);

  let orderData = null;
  let idempotencyKey = '';
  let totalAmount = 0;
  let roundedTotalAmount = 0;
  let razorpayResult = null;

  try {
    totalAmount = Number((amountToPay + SERVICE_FEE + PLATFORM_FEE).toFixed(2));
    roundedTotalAmount = Math.round(totalAmount);
    idempotencyKey = buildIdempotencyKey();
    const orderRequestBodies = [
      {
        amount: roundedTotalAmount,
        display_amount: totalAmount,
        recharge_amount: amountToPay,
        service_fee: SERVICE_FEE,
        gst_amount: PLATFORM_FEE,
        site_id: siteInfo.siteId,
        slug: siteInfo.slug,
      },
    ];

    let lastOrderErrorMessage = "";

    for (let attemptIndex = 0; attemptIndex < orderRequestBodies.length; attemptIndex += 1) {
      const orderResponse = await fetch(getRazorpayOrderUrl(), {
        method: "POST",
        headers: await getAuthHeaders(idempotencyKey),
        body: JSON.stringify(orderRequestBodies[attemptIndex]),
      });

      if (orderResponse.status === 401) {
        console.warn("Session expired (401) on recharge - logging out");
        setLoading(false);
        await logout();
        return;
      }

      if (orderResponse.ok) {
        orderData = await orderResponse.json();
        break;
      }

      lastOrderErrorMessage = await parseApiError(orderResponse);
      console.log(`Order API attempt ${attemptIndex + 1} failed:`, lastOrderErrorMessage);

      const canRetryAlternateAmount =
        attemptIndex < orderRequestBodies.length - 1 &&
        shouldRetryOrderWithAlternateAmount(lastOrderErrorMessage);

      if (!canRetryAlternateAmount) {
        throw new Error(lastOrderErrorMessage);
      }
    }

    if (!orderData) {
      throw new Error(lastOrderErrorMessage || "Order could not be created.");
    }

    if (!orderData?.order_id) {
      throw new Error("Order ID was not returned by the backend.");
    }

    if (!orderData?.razorpay_key) {
      throw new Error("Razorpay key was not returned by the backend.");
    }

    const merchantName =
      orderData.merchant_name ||
      orderData.merchant ||
      siteData?.meter_name ||
      "Energy Meter Recharge";

    const merchantLogo =
      orderData.logo_url ||
      orderData.image ||
      undefined;

    const options = {
      description: `Meter Recharge - ${customerDetails.accountId}`,
      currency: 'INR',
      key: orderData.razorpay_key,
      amount: orderData.amount || roundedTotalAmount,
      order_id: orderData.order_id,
      name: merchantName,
      image: merchantLogo,

      prefill: {
        email: siteInfo.user?.email || 'customer@gmail.com',
        contact: siteInfo.user?.phone || '9999999999',
        name: customerDetails.name || "Test User"
      },

      theme: {
        color: '#4f46e5'
      },

      retry: {
        enabled: true,
        max_count: 3
      },

      send_sms_hash: true
    };

    razorpayResult = await RazorpayCheckout.open(options);

    const verifyResponse = await fetch(getRazorpayVerifyUrl(), {
      method: "POST",
      headers: await getAuthHeaders(idempotencyKey),
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        transaction_id: orderData.transaction_id,
        order_id: orderData.order_id,
        razorpay_order_id: razorpayResult.razorpay_order_id || orderData.order_id,
        razorpay_payment_id: razorpayResult.razorpay_payment_id,
        payment_id: razorpayResult.razorpay_payment_id,
        razorpay_signature: razorpayResult.razorpay_signature,
        amount: roundedTotalAmount,
        display_amount: totalAmount,
        status: 'success',
        payment_status: 'success',
        razorpay_status: 'Captured',
        display_status: 'Captured',
        site_id: siteInfo.siteId,
        slug: siteInfo.slug,
      }),
    });

    if (verifyResponse.status === 401) {
      console.warn("Session expired (401) on payment verification - logging out");
      setLoading(false);
      await logout();
      return;
    }

    if (!verifyResponse.ok) {
      const message = await parseApiError(verifyResponse);
      throw new Error(message);
    }

    const verifyData = await verifyResponse.json();

    setLoading(false);

    showPaymentStatus(
      'success',
      'Recharge Successful',
      verifyData?.message || 'Your payment was completed and saved successfully.',
      `Payment ID: ${razorpayResult.razorpay_payment_id}`
    );

    console.log("Payment Success:", razorpayResult);
    console.log("Payment Verify:", verifyData);

    fetchSiteData();

    setSelectedAmount(null);
    setCustomAmount('');
    setPaymentAmount('');

  } catch (error) {

    setLoading(false);

    console.log("Payment Error:", error);

    if (orderData?.order_id) {
      try {
        await syncPaymentStatus({
          idempotencyKey,
          orderData,
          amount: roundedTotalAmount,
          displayAmount: totalAmount,
          razorpayResult,
          status: error?.code === 2 ? 'cancelled' : 'failed',
          razorpayDisplayStatus: error?.code === 2 ? 'Cancelled' : 'Failed',
          errorMessage: error?.description || error?.message || 'Payment failed',
        });
      } catch (syncError) {
        console.log("Payment Failure Sync Error:", syncError);
      }
    }

    const paymentError = error?.code
      ? getReadablePaymentError(error)
      : getFriendlyServerPaymentError(error?.message);
    showPaymentStatus(
      'error',
      paymentError.title,
      paymentError.message,
      paymentError.details
    );
  }
};


  /* -------------------- MANUAL AMOUNT INPUT -------------------- */

  const handleManualAmount = () => {
    setShowNumpad(true);
    setNumpadValue(customAmount || '');
  };

  const handleNumpadPress = (value) => {
    if (value === 'backspace') {
      setNumpadValue((p) => p.slice(0, -1));
    } else if (value === 'clear') {
      setNumpadValue('');
    } else if (value === 'done') {
      setCustomAmount(numpadValue);
      setSelectedAmount(null);
      setShowNumpad(false);
    } else if (value === '.') {
      if (!numpadValue.includes('.')) {
        setNumpadValue((p) => p + value);
      }
    } else {
      if (numpadValue.length < 8) setNumpadValue((p) => p + value);
    }
  };

  const handleCustomAmountChange = (text) => {
    // Allow digits and one decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    setCustomAmount(cleaned);
    if (cleaned) {
      setSelectedAmount(null);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: theme.background }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}
          <View style={styles.header}/>

          {/* CUSTOMER DETAILS CARD */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            style={[styles.customerDetailsCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
          >
            {siteLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.mutedText }]}>Loading site information...</Text>
              </View>
            ) : siteError ? (
              <View style={styles.errorContainer}>
                <Icon name="error" size={40} color={theme.error} />
                <Text style={styles.errorText}>{siteError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchSiteData}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
              <View style={[styles.topSiteBanner, { backgroundColor: isDarkMode ? theme.card : '#eef2ff', borderColor: theme.border }]}>
                <Text style={[styles.topSiteLabel, { color: theme.mutedText }]}>Site Name</Text>
                <Text numberOfLines={1} style={[styles.topSiteValue, { color: theme.text }]}>
                  {customerDetails.meterNo}
                </Text>
              </View>
              <View style={styles.customerHeader}>
  <View style={styles.avatarContainer}>
    <Icon name="account-circle" size={40} color="#fff" />
  </View>
  <View style={styles.customerInfo}>
    <Text numberOfLines={1} style={[styles.customerName, { color: theme.text }]}>{customerDetails.name}</Text>
    <Text style={[styles.customerId, { color: theme.mutedText }]}>Account ID: {customerDetails.accountId}</Text>
  </View>
</View>

<View style={styles.siteInfoSection}>
  <View style={styles.siteInfoRow}>
    <View style={[styles.siteInfoItem, { backgroundColor: theme.card }]}>
      <Icon name="speed" size={20} color="#4f46e5" />
      <Text style={[styles.infoLabel, { color: theme.mutedText }]}>Site Name</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: theme.text }]}>{customerDetails.meterNo}</Text>
    </View>
    <View style={[styles.siteInfoItem, { backgroundColor: theme.card }]}>
      <Icon name="store" size={20} color="#4f46e5" />
      <Text style={[styles.infoLabel, { color: theme.mutedText }]}>Meter Name</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: theme.text }]}>{customerDetails.shopName}</Text>
    </View>
  </View>
</View>

<View style={styles.balanceSection}>
  <View style={styles.balanceRow}>
    <View style={[styles.balanceItem, { backgroundColor: isDarkMode ? '#052e2b' : '#ecfdf5', borderColor: isDarkMode ? '#14532d' : '#bbf7d0' }]}>
      <Text style={[styles.balanceLabel, { color: theme.mutedText }]}>Available Balance</Text>
      <Text style={styles.balanceAmount}>{customerDetails.availableBalance}</Text>
    </View>
    <View style={[styles.addressItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.addressContent}>
        <Icon name="location-on" size={20} color="#4f46e5" />
        <View style={styles.addressTextContainer}>
          <Text style={[styles.infoLabel, { color: theme.mutedText }]}>Address</Text>
          <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>{customerDetails.address}</Text>
        </View>
      </View>
    </View>
  </View>
</View>
              </>
            )}
          </Animatable.View>

          {/* QUICK RECHARGE OPTIONS - GRID LAYOUT */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            delay={200}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="bolt" size={20} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Recharge Packs</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.mutedText }]}>Select from popular options</Text>
            </View>
            
            <View style={styles.gridContainer}>
              {rechargeOptions.map((opt, index) => (
                <TouchableOpacity
                  key={opt.amount}
                  style={[
                    styles.rechargeOptionCard,
                    selectedAmount === opt.amount && styles.selectedCard,
                    { backgroundColor: selectedAmount === opt.amount ? opt.bgColor : theme.surface }
                  ]}
                  onPress={() => {
                    if (selectedAmount === opt.amount) {
                      setSelectedAmount(null);
                      setCustomAmount('');
                    } else {
                      setSelectedAmount(opt.amount);
                      setCustomAmount('');
                    }
                  }}
                >
                  <View
                    style={[
                      styles.cardAccentGlow,
                      { backgroundColor: selectedAmount === opt.amount ? `${opt.color}22` : `${opt.color}12` }
                    ]}
                  />
                  <View
                    style={[
                      styles.cardAccentBar,
                      { backgroundColor: selectedAmount === opt.amount ? opt.color : `${opt.color}66` }
                    ]}
                  />
                  <View style={styles.cardContent}>
                    <View style={styles.amountBadgeRow}>
                      <View
                        style={[
                          styles.amountBadge,
                          { backgroundColor: selectedAmount === opt.amount ? `${opt.color}18` : '#f8fafc' }
                        ]}
                      >
                        <View style={[styles.amountBadgeDot, { backgroundColor: opt.color }]} />
                      </View>
                    </View>
                    <Text style={[
                      styles.amountText,
                      {
                        color: selectedAmount === opt.amount ? opt.color : theme.text,
                      }
                    ]}>
                      ₹{opt.amount.toLocaleString()}
                    </Text>
                    
                    {selectedAmount === opt.amount && (
                      <View style={styles.selectedIndicator}>
                        <View style={[styles.selectedDot, { backgroundColor: opt.color }]} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animatable.View>

          {/* CUSTOM AMOUNT */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            delay={300}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="create" size={20} color="#4f46e5" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Custom Amount</Text>
              </View>
              <Text 
                style={[
                  styles.sectionSubtitle, 
                  { color: (parseFloat(customAmount) > 100000) ? '#ef4444' : theme.mutedText }
                ]}
              >
                {parseFloat(customAmount) > 100000 
                  ? 'Amount cannot exceed ₹1,00,000' 
                  : 'Enter any amount between ₹1 - ₹1,00,000'}
              </Text>
            </View>
            <View style={[styles.customAmountContainer, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
              <View style={[styles.amountInputWrapper, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={styles.currencyWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                </View>
                <TextInput
                  ref={customAmountInputRef}
                  style={[styles.amountInput, { color: theme.text }]}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  maxLength={9}
                  placeholderTextColor={theme.gray}
                />
                <TouchableOpacity 
                  style={styles.keyboardButton}
                  onPress={handleManualAmount}
                >
                  <View style={styles.keyboardButtonContainer}>
                    <Icon name="dialpad" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.quickAmountsLabel, { color: theme.mutedText }]}>Quick select:</Text>
              <View style={styles.quickAmounts}>
                {quickAmounts.map((item, index) => (
                  <TouchableOpacity
                    key={item.amount}
                    style={[styles.quickAmountButton, { backgroundColor: isDarkMode ? theme.card : item.color, borderColor: theme.border }]}
                    onPress={() => {
                      setCustomAmount(item.amount.toString());
                      setSelectedAmount(null);
                    }}
                  >
                    <Text style={[styles.quickAmountText, { color: theme.text }]}>₹{item.amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animatable.View>

          {/* PAYMENT SUMMARY */}
          {(selectedAmount || customAmount) && (
            <Animatable.View 
              animation="fadeInUp"
              duration={600}
              style={[styles.paymentSummary, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
            >
              <View style={styles.summaryHeader}>
                <Icon name="receipt" size={20} color="#4f46e5" />
                <Text style={[styles.summaryTitle, { color: theme.text }]}>Payment Summary</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.mutedText }]}>Recharge Amount</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>₹ {selectedAmount || customAmount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.feeRow}>
                  <Text style={[styles.summaryLabel, { color: theme.mutedText }]}>Service Fee</Text>
                  <Icon name="info-outline" size={16} color="#94a3b8" />
                </View>
                <Text style={[styles.summaryValue, { color: theme.text }]}>₹ {SERVICE_FEE.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.mutedText }]}>Platform Fees</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>₹ {PLATFORM_FEE.toFixed(2)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={[styles.summaryRow, styles.totalSummaryRow]}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total Payable</Text>
                <Text style={styles.totalValue}>
                  ₹ {payableAmount.toFixed(2)}
                </Text>
              </View>
            </Animatable.View>
          )}

          {/* PAY BUTTON */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            delay={500}
            style={styles.payButtonContainer}
          >
            <TouchableOpacity
              style={[
                styles.payButton,
                ((!selectedAmount && !customAmount) || (parseFloat(customAmount) > 100000)) && styles.disabledButton,
                loading && styles.loadingButton,
              ]}
              disabled={(!selectedAmount && !customAmount) || (parseFloat(customAmount) > 100000) || loading}
              onPress={handlePayment}
              activeOpacity={0.9}
            >
              <View style={[
                styles.payButtonContainerInner,
                ((!selectedAmount && !customAmount) || (parseFloat(customAmount) > 100000) || loading) && 
                styles.disabledButtonInner
              ]}>
                {loading ? (
                  <View style={styles.buttonLoadingContainer}>
                    <View style={styles.loadingSpinner} />
                    <Text style={styles.payButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    <Icon name="lock" size={20} color="#fff" style={styles.lockIcon} />
                    <Text style={styles.payButtonText}>
                      {selectedAmount || customAmount
                        ? `Pay ₹${payableAmount.toFixed(2)}`
                        : 'Select Amount to Continue'}
                    </Text>
                    <Text style={[styles.payButtonText, styles.hiddenPayButtonText]}>
                      {selectedAmount || customAmount 
                        ? `Pay ₹${selectedAmount || customAmount}` 
                        : 'Select Amount to Continue'}
                    </Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.secureInfo}>
              <Icon name="security" size={16} color="#10b981" />
              <Text style={[styles.secureText, { color: theme.mutedText }]}>
                100% Secure Payment • Protected by Razorpay
              </Text>
            </View>
          </Animatable.View>

          {/* BOTTOM SPACER */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NUMPAD MODAL */}
      <Modal
        visible={showNumpad}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.numpadModalOverlay}>
          <View style={[styles.numpadModal, { backgroundColor: theme.surface }]}>
            <View style={styles.numpadHeader}>
              <Text style={[styles.numpadTitle, { color: theme.text }]}>Enter Amount</Text>
              <TouchableOpacity 
                style={styles.numpadClose}
                onPress={() => setShowNumpad(false)}
              >
                <Icon name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.numpadDisplay, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={styles.numpadCurrency}>₹</Text>
              <Text style={[styles.numpadValue, { color: theme.text }]}>{numpadValue || '0'}</Text>
            </View>
            
            <View style={styles.numpadGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.numpadKey, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleNumpadPress(item.toString())}
                  activeOpacity={0.7}
                >
                  {item === 'backspace' ? (
                    <Icon name="backspace" size={24} color="#4f46e5" />
                  ) : (
                    <Text style={[styles.numpadKeyText, { color: theme.text }]}>{item}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.numpadActions}>
              <TouchableOpacity 
                style={styles.numpadActionButton}
                onPress={() => handleNumpadPress('clear')}
              >
                <Text style={[styles.numpadActionText, { backgroundColor: theme.card, color: theme.mutedText }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.numpadActionButton, styles.numpadDoneButton]}
                onPress={() => handleNumpadPress('done')}
              >
                <View style={styles.numpadDoneContainer}>
                  <Text style={styles.numpadDoneText}>Done</Text>
                  <Icon name="check" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentStatus.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hidePaymentStatus}
      >
        <View style={styles.paymentStatusOverlay}>
          <Animatable.View
            animation="zoomIn"
            duration={280}
            style={[styles.paymentStatusCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
          >
            <View
              style={[
                styles.paymentStatusIconWrap,
                paymentStatus.type === 'success'
                  ? styles.paymentSuccessIconWrap
                  : paymentStatus.type === 'warning'
                  ? [
                      styles.paymentWarningIconWrap,
                      {
                        backgroundColor: isDarkMode ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3',
                        borderColor: isDarkMode ? 'rgba(234, 179, 8, 0.3)' : '#fef08a'
                      }
                    ]
                  : styles.paymentErrorIconWrap,
              ]}
            >
              <Icon
                name={
                  paymentStatus.type === 'success'
                    ? 'check-circle'
                    : paymentStatus.type === 'warning'
                    ? 'warning'
                    : 'error-outline'
                }
                size={34}
                color={
                  paymentStatus.type === 'success'
                    ? '#059669'
                    : paymentStatus.type === 'warning'
                    ? '#eab308'
                    : '#dc2626'
                }
              />
            </View>

            <Text style={[styles.paymentStatusTitle, { color: theme.text }]}>
              {paymentStatus.title}
            </Text>
            <Text style={[styles.paymentStatusMessage, { color: theme.mutedText }]}>
              {paymentStatus.message}
            </Text>
            {!!paymentStatus.details && (
              <View style={[styles.paymentStatusDetailsBox, { backgroundColor: isDarkMode ? theme.card : '#f8fafc', borderColor: theme.border }]}>
                <Text style={[styles.paymentStatusDetails, { color: theme.text }]}>
                  {paymentStatus.details}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.paymentStatusButton,
                paymentStatus.type === 'success'
                  ? styles.paymentSuccessButton
                  : paymentStatus.type === 'warning'
                  ? [styles.paymentWarningButton, { backgroundColor: theme.primary }]
                  : styles.paymentErrorButton,
              ]}
              onPress={hidePaymentStatus}
              activeOpacity={0.9}
            >
              <Text style={styles.paymentStatusButtonText}>
                {paymentStatus.type === 'success'
                  ? 'Done'
                  : paymentStatus.type === 'warning'
                  ? 'OK'
                  : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,

  },
  customerDetailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -30,
    padding: 20,
    borderRadius: 22,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 24,
    minHeight: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  topSiteBanner: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  topSiteLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  topSiteValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#4f46e5',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 3,
  },
  customerId: {
    fontSize: 12,
    color: '#64748b',
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  balanceSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  balanceItem: {
    flex: 1,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },

  lastPayment: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 3,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  section: {
    marginBottom: 28,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  rechargeOptionCard: {
    width: (width - 48) / 2 - 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 96,
  },
  selectedCard: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.16,
    transform: [{ scale: 1.015 }],
  },
  cardAccentGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    top: -18,
    right: -14,
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
    justifyContent: 'center',
  },
  amountBadgeRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  amountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  amountBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 10,
  },
  selectedDot: {
    width: 18,
    height: 5,
    borderRadius: 999,
  },
  customAmountContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
  },
  currencyWrapper: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4f46e5',
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  keyboardButton: {
    marginLeft: 8,
  },
  keyboardButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },
  quickAmountsLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  paymentSummary: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalSummaryRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 6,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4f46e5',
    textAlign: 'center',
  },
  payButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  payButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  payButtonContainerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#4f46e5',
  },
  disabledButtonInner: {
    backgroundColor: '#cbd5e1',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingButton: {
    opacity: 0.8,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: 10,
    marginRight: 12,
  },
  lockIcon: {
    marginRight: 12,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  hiddenPayButtonText: {
    display: 'none',
  },
  secureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  numpadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  numpadModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  numpadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  numpadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  numpadClose: {
    padding: 8,
  },
  numpadDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  numpadCurrency: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4f46e5',
    marginRight: 12,
  },
  numpadValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1e293b',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numpadKey: {
    width: '30%',
    aspectRatio: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  numpadKeyText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  numpadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numpadActionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  numpadActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    padding: 18,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  numpadDoneButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  numpadDoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#4f46e5',
  },
  numpadDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  webviewHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
  },
  closeButton: {
    padding: 8,
    marginRight: 16,
  },
  webviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  paymentStatusOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  paymentStatusCard: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  paymentStatusIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  paymentSuccessIconWrap: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  paymentErrorIconWrap: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  paymentWarningIconWrap: {
    backgroundColor: '#fef9c3',
    borderColor: '#fef08a',
  },
  paymentStatusTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  paymentStatusMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  paymentStatusDetailsBox: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  paymentStatusDetails: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
  },
  paymentStatusButton: {
    minWidth: 160,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  paymentSuccessButton: {
    backgroundColor: '#059669',
  },
  paymentErrorButton: {
    backgroundColor: '#4f46e5',
  },
  paymentWarningButton: {
    backgroundColor: '#eab308',
  },
  paymentStatusButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  siteInfoSection: {
  marginBottom: 20,
},
siteInfoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
siteInfoItem: {
  flex: 1,
  backgroundColor: '#f8fafc',
  padding: 14,
  borderRadius: 14,
  marginHorizontal: 4,
  alignItems: 'center',
},

addressItem: {
  flex: 1,
  backgroundColor: '#f8fafc',
  padding: 10,
  borderRadius: 18,
  marginLeft: 10,
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#e2e8f0',
},

addressContent: {
  flexDirection: 'row',
  alignItems: 'flex-start',
},
addressTextContainer: {
  flex: 1,
  marginLeft: 12,
},

});
