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
import { getSiteDataUrl } from '../config'; // Assuming config is in same directory
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
const { width, height } = Dimensions.get('window');

export default function RechargeScreen() {
  const { theme, isDarkMode } = useTheme();
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
    const { user, getSlug, getSiteName, getSiteId } = useAuth();
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
  availableBalance: `₹ ${
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


 

  /* -------------------- PAYMENT -------------------- */

  // const handlePayment = async () => {
  //   let amountToPay = selectedAmount;
    
  //   if (customAmount && parseFloat(customAmount) >= 100) {
  //     amountToPay = parseFloat(customAmount);
  //   }
    
  //   if (!amountToPay || amountToPay < 100) {
  //     Alert.alert('Invalid Amount', 'Please select or enter an amount (minimum ₹100)');
  //     return;
  //   }

  //   setLoading(true);
    
  //   const totalAmount = Math.round((amountToPay + 10 + 1.8) * 100);

  //   const options = {
  //     description: `Meter Recharge - ${customerDetails.accountId}`,
  //     image: 'https://i.imgur.com/39go799.png',
  //     currency: 'INR',
  //     key: 'rzp_test_SR4qKtwChbUt4f',
  //     amount: totalAmount,
  //     name: 'Sochiot Innovation Pvt. Ltd.',
  //     prefill: {
  //       email: siteInfo.user?.email || 'customer@gmail.com',
  //       contact: siteInfo.user?.phone || '9999999999',
  //       name: customerDetails.name
  //     },
  //     theme: { 
  //       color: '#4f46e5',
  //       hide_topbar: false
  //     },
  //     retry: {
  //       enabled: true,
  //       max_count: 5
  //     },
  //     // Explicitly enable all methods and prioritize UPI/Cards
  //     config: {
  //       display: {
  //         blocks: {
  //           upi: {
  //             name: 'Pay via UPI / QR',
  //             instruments: [
  //               { method: 'upi' }
  //             ]
  //           }
  //         },
  //         sequence: ['block.upi', 'block.other'],
  //         preferences: {
  //           show_default_blocks: true
  //         }
  //       }
  //     }
  //   };

  //   RazorpayCheckout.open(options).then((data) => {
  //     // handle success
  //     setLoading(false);
  //     Alert.alert(
  //       'Payment Successful! 🎉',
  //       `Your recharge of ₹${amountToPay} has been processed successfully.\n\nPayment ID: ${data.razorpay_payment_id}`,
  //       [{ 
  //         text: 'Done', 
  //         onPress: () => {
  //           setSelectedAmount(null);
  //           setCustomAmount('');
  //           setPaymentAmount('');
  //         },
  //         style: 'default'
  //       }]
  //     );
  //   }).catch((error) => {
  //     // handle failure
  //     setLoading(false);
  //     if (error.code === 2) {
  //       // User cancelled
  //       Alert.alert('Payment Cancelled', 'Your payment was not completed. You can try again.');
  //     } else {
  //       Alert.alert('Payment Failed', error.description || 'Something went wrong. Please try again.');
  //     }
  //   });
  // };

  const handlePayment = async () => {
  let amountToPay = selectedAmount;

  if (customAmount && parseFloat(customAmount) >= 100) {
    amountToPay = parseFloat(customAmount);
  }

  if (!amountToPay || amountToPay < 100) {
    Alert.alert('Invalid Amount', 'Please select or enter minimum ₹100');
    return;
  }

  setLoading(true);

  try {

    const totalAmount = Math.round((amountToPay + 10 + 1.8) * 100);

    const options = {
      description: `Meter Recharge - ${customerDetails.accountId}`,
      currency: 'INR',
      key: 'rzp_test_SR4qKtwChbUt4f',
      amount: totalAmount,
      name: 'Sochiot Innovation Pvt. Ltd.',
      image: 'https://i.imgur.com/39go799.png',

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

    const data = await RazorpayCheckout.open(options);

    setLoading(false);

    Alert.alert(
      "Payment Successful",
      `Payment ID: ${data.razorpay_payment_id}`
    );

    console.log("Payment Success:", data);

    setSelectedAmount(null);
    setCustomAmount('');
    setPaymentAmount('');

  } catch (error) {

    setLoading(false);

    console.log("Payment Error:", error);

    if (error.code === 2) {
      Alert.alert("Payment Cancelled", "User cancelled the payment");
    } else {
      Alert.alert(
        "Payment Failed",
        error.description || "Payment could not be completed"
      );
    }
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
      const amt = parseFloat(numpadValue);
      if (amt >= 100 && amt <= 50000) {
        setCustomAmount(numpadValue);
        setSelectedAmount(null);
        setShowNumpad(false);
      } else {
        Alert.alert('Invalid Amount', 'Please enter an amount between ₹100 to ₹50,000');
      }
    } else if (value === '.') {
      if (!numpadValue.includes('.')) {
        setNumpadValue((p) => p + value);
      }
    } else {
      if (numpadValue.length < 8) setNumpadValue((p) => p + value);
    }
  };

  const handleCustomAmountChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericText);
    if (numericText) {
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
              <View style={styles.customerHeader}>
  <View style={styles.avatarContainer}>
    <Icon name="account-circle" size={40} color="#fff" />
  </View>
  <View style={styles.customerInfo}>
    <Text style={[styles.customerName, { color: theme.text }]}>{customerDetails.name}</Text>
    <Text style={[styles.customerId, { color: theme.mutedText }]}>Account ID: {customerDetails.accountId}</Text>
  </View>
</View>

<View style={styles.siteInfoSection}>
  <View style={styles.siteInfoRow}>
    <View style={[styles.siteInfoItem, { backgroundColor: theme.card }]}>
      <Icon name="speed" size={20} color="#4f46e5" />
      <Text style={[styles.infoLabel, { color: theme.mutedText }]}>Site Name</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{customerDetails.meterNo}</Text>
    </View>
    <View style={[styles.siteInfoItem, { backgroundColor: theme.card }]}>
      <Icon name="store" size={20} color="#4f46e5" />
      <Text style={[styles.infoLabel, { color: theme.mutedText }]}>Meter Name</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{customerDetails.shopName}</Text>
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
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.optionIcon}>{opt.icon}</Text>
                      {opt.tag && (
                        <View style={[
                          styles.tagBadge,
                          opt.tag === 'Popular' && styles.tagPopular,
                          opt.tag === 'Value' && styles.tagValue,
                          opt.tag === 'Best' && styles.tagBest,
                        ]}>
                          <Text style={styles.tagText}>{opt.tag}</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[
                      styles.amountText,
                      { color: selectedAmount === opt.amount ? opt.color : theme.text }
                    ]}>
                      ₹{opt.amount.toLocaleString()}
                    </Text>
                    
                    <Text style={[styles.optionDescription, { color: theme.mutedText }]}>{opt.description}</Text>
                    
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
              <Text style={[styles.sectionSubtitle, { color: theme.mutedText }]}>Enter any amount between ₹100 - ₹50,000</Text>
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
                  keyboardType="numeric"
                  maxLength={6}
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
                <Text style={[styles.summaryValue, { color: theme.text }]}>₹ 10.00</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.mutedText }]}>GST (18%)</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>₹ 1.80</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total Payable</Text>
                <Text style={styles.totalValue}>
                  ₹ {((selectedAmount || parseFloat(customAmount) || 0) + 10 + 1.8).toFixed(2)}
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
                (!selectedAmount && !customAmount) && styles.disabledButton,
                loading && styles.loadingButton,
              ]}
              disabled={!selectedAmount && !customAmount || loading}
              onPress={handlePayment}
              activeOpacity={0.9}
            >
              <View style={[
                styles.payButtonContainerInner,
                ((!selectedAmount && !customAmount) || loading) && 
                styles.disabledButtonInner
              ]}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <View style={styles.loadingSpinner} />
                    <Text style={styles.payButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    <Icon name="lock" size={20} color="#fff" style={styles.lockIcon} />
                    <Text style={styles.payButtonText}>
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
    padding: 24,
    borderRadius: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
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
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#4f46e5',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
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
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmount: {
  fontSize: 28,
  fontWeight: '900',
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
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  section: {
  marginBottom: 32,
},

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rechargeOptionCard: {
    width: (width - 48) / 2 - 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  optionIcon: {
    fontSize: 28,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPopular: {
    backgroundColor: '#fef3c7',
  },
  tagValue: {
    backgroundColor: '#dbeafe',
  },
  tagBest: {
    backgroundColor: '#dcfce7',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  customAmountContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
    fontSize: 28,
    fontWeight: '800',
    color: '#4f46e5',
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 16,
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
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  paymentSummary: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4f46e5',
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
    paddingVertical: 22,
    paddingHorizontal: 24,
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
  loadingContainer: {
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
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 8,
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
  padding: 16,
  borderRadius: 16,
  marginHorizontal: 4,
  alignItems: 'center',
},
balanceSection: {
  paddingTop: 20,
  borderTopWidth: 1,
  borderTopColor: '#f1f5f9',
},
balanceRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'stretch',
},
balanceItem: {
  flex: 1,
  backgroundColor: '#ecfdf5',
  padding: 20,
  borderRadius: 20,
  marginRight: 10,
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#bbf7d0',
},

balanceLabel: {
  fontSize: 12,
  color: '#64748b',
  fontWeight: '600',
  marginBottom: 4,
},
balanceAmount: {
  fontSize: 20,
  fontWeight: '800',
  color: '#10b981',
},
addressItem: {
  flex: 1,
  backgroundColor: '#f8fafc',
  padding: 10,
  borderRadius: 20,
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
infoLabel: {
  fontSize: 12,
  color: '#64748b',
  marginBottom: 4,
  fontWeight: '600',
},
infoValue: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1e293b',
},
});
