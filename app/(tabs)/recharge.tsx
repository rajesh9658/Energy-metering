import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

export default function RechargeScreen() {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  const [showPaymentWeb, setShowPaymentWeb] = useState(false);
  const [razorpayHtml, setRazorpayHtml] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const customAmountInputRef = useRef(null);

  const customerDetails = {
    accountId: '0129665248',
    name: 'Sanjay Gupta',
    meterNo: '9549678',
    availableBalance: '₹ 1,250.50',
    dueDate: '15 March 2024',
    lastRecharge: '₹ 2,000 on 1 Feb 2024',
    address: 'H-12, Green Park, New Delhi',
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

  const handlePayment = async () => {
    let amountToPay = selectedAmount;
    
    if (customAmount && parseFloat(customAmount) >= 100) {
      amountToPay = parseFloat(customAmount);
    }
    
    if (!amountToPay || amountToPay < 100) {
      Alert.alert('Invalid Amount', 'Please select or enter an amount (minimum ₹100)');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const totalAmount = Math.round((amountToPay + 10 + 1.8) * 100);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          </head>
          <body style="background: #4f46e5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
            <div id="loader" style="color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
              <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px);">
                <h2 style="margin-bottom: 10px;">Processing Payment...</h2>
                <p style="opacity: 0.9; margin-bottom: 20px;">₹${amountToPay} via ${paymentMethod.toUpperCase()}</p>
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
              </div>
            </div>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
            <script>
              setTimeout(function() {
                var options = {
                  key: "rzp_test_S2t1onSDtI24BI",
                  amount: ${totalAmount},
                  currency: "INR",
                  name: "Sochiot Innovation Pvt. Ltd.",
                  description: "Meter Recharge - ${customerDetails.accountId}",
                  prefill: {
                    name: "${customerDetails.name}",
                    email: "customer@gmail.com",
                    contact: "9999999999"
                  },
                  theme: {
                    color: "#4f46e5"
                  },
                  handler: function (response) {
                    window.ReactNativeWebView.postMessage(
                      JSON.stringify({ 
                        status: "success", 
                        data: response,
                        amount: ${amountToPay}
                      })
                    );
                  },
                  modal: {
                    ondismiss: function () {
                      window.ReactNativeWebView.postMessage(
                        JSON.stringify({ status: "cancel" })
                      );
                    }
                  }
                };
                var rzp = new Razorpay(options);
                rzp.open();
              }, 1500);
            </script>
          </body>
        </html>
      `;

      setRazorpayHtml(html);
      setShowPaymentWeb(true);
    }, 800);
  };

  const onPaymentMessage = (event) => {
    const msg = JSON.parse(event.nativeEvent.data);
    setShowPaymentWeb(false);

    if (msg.status === 'success') {
      Alert.alert(
        'Payment Successful! 🎉',
        `Your recharge of ₹${msg.amount} has been processed successfully.\n\nPayment ID: ${msg.data.razorpay_payment_id}`,
        [{ 
          text: 'Done', 
          onPress: () => {
            setSelectedAmount(null);
            setCustomAmount('');
            setPaymentAmount('');
          },
          style: 'default'
        }]
      );
    } else {
      Alert.alert('Payment Cancelled', 'Your payment was not completed. You can try again.');
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton}>
                  <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>Recharge Meter</Text>
                  <Text style={styles.headerSubtitle}>Instant power recharge</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationButton}>
                <Icon name="notifications" size={24} color="#fff" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CUSTOMER DETAILS CARD */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            style={styles.customerDetailsCard}
          >
            <View style={styles.customerHeader}>
              <View style={styles.avatarContainer}>
                <Icon name="account-circle" size={40} color="#fff" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerDetails.name}</Text>
                <Text style={styles.customerId}>Account ID: {customerDetails.accountId}</Text>
              </View>
            </View>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Icon name="location-on" size={20} color="#4f46e5" />
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{customerDetails.address}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="speed" size={20} color="#4f46e5" />
                <Text style={styles.detailLabel}>Meter No</Text>
                <Text style={styles.detailValue}>{customerDetails.meterNo}</Text>
              </View>
            </View>
            
            <View style={styles.balanceSection}>
              <View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{customerDetails.availableBalance}</Text>
              </View>
              <View style={styles.balanceRight}>
                <Text style={styles.dueDateLabel}>Due Date</Text>
                <Text style={styles.dueDate}>{customerDetails.dueDate}</Text>
              </View>
            </View>
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
                <Text style={styles.sectionTitle}>Quick Recharge Packs</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Select from popular options</Text>
            </View>
            
            <View style={styles.gridContainer}>
              {rechargeOptions.map((opt, index) => (
                <TouchableOpacity
                  key={opt.amount}
                  style={[
                    styles.rechargeOptionCard,
                    selectedAmount === opt.amount && styles.selectedCard,
                    { backgroundColor: selectedAmount === opt.amount ? opt.bgColor : '#fff' }
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
                      { color: selectedAmount === opt.amount ? opt.color : '#1e293b' }
                    ]}>
                      ₹{opt.amount.toLocaleString()}
                    </Text>
                    
                    <Text style={styles.optionDescription}>{opt.description}</Text>
                    
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
                <Text style={styles.sectionTitle}>Custom Amount</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Enter any amount between ₹100 - ₹50,000</Text>
            </View>
            <View style={styles.customAmountContainer}>
              <View style={styles.amountInputWrapper}>
                <View style={styles.currencyWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                </View>
                <TextInput
                  ref={customAmountInputRef}
                  style={styles.amountInput}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  maxLength={6}
                  placeholderTextColor="#94a3b8"
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
              
              <Text style={styles.quickAmountsLabel}>Quick select:</Text>
              <View style={styles.quickAmounts}>
                {quickAmounts.map((item, index) => (
                  <TouchableOpacity
                    key={item.amount}
                    style={[styles.quickAmountButton, { backgroundColor: item.color }]}
                    onPress={() => {
                      setCustomAmount(item.amount.toString());
                      setSelectedAmount(null);
                    }}
                  >
                    <Text style={styles.quickAmountText}>₹{item.amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animatable.View>

          {/* PAYMENT METHOD */}
          {/*  */}

          {/* PAYMENT SUMMARY */}
          {(selectedAmount || customAmount) && (
            <Animatable.View 
              animation="fadeInUp"
              duration={600}
              style={styles.paymentSummary}
            >
              <View style={styles.summaryHeader}>
                <Icon name="receipt" size={20} color="#4f46e5" />
                <Text style={styles.summaryTitle}>Payment Summary</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Recharge Amount</Text>
                <Text style={styles.summaryValue}>₹ {selectedAmount || customAmount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.feeRow}>
                  <Text style={styles.summaryLabel}>Service Fee</Text>
                  <Icon name="info-outline" size={16} color="#94a3b8" />
                </View>
                <Text style={styles.summaryValue}>₹ 10.00</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (18%)</Text>
                <Text style={styles.summaryValue}>₹ 1.80</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
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
              <Text style={styles.secureText}>
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
          <View style={styles.numpadModal}>
            <View style={styles.numpadHeader}>
              <Text style={styles.numpadTitle}>Enter Amount</Text>
              <TouchableOpacity 
                style={styles.numpadClose}
                onPress={() => setShowNumpad(false)}
              >
                <Icon name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.numpadDisplay}>
              <Text style={styles.numpadCurrency}>₹</Text>
              <Text style={styles.numpadValue}>{numpadValue || '0'}</Text>
            </View>
            
            <View style={styles.numpadGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.numpadKey}
                  onPress={() => handleNumpadPress(item.toString())}
                  activeOpacity={0.7}
                >
                  {item === 'backspace' ? (
                    <Icon name="backspace" size={24} color="#4f46e5" />
                  ) : (
                    <Text style={styles.numpadKeyText}>{item}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.numpadActions}>
              <TouchableOpacity 
                style={styles.numpadActionButton}
                onPress={() => handleNumpadPress('clear')}
              >
                <Text style={styles.numpadActionText}>Clear</Text>
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

      {/* PAYMENT WEBVIEW MODAL */}
      <Modal 
        visible={showPaymentWeb} 
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.webviewHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowPaymentWeb(false)}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Complete Payment</Text>
          <View style={styles.headerRight} />
        </View>
        <WebView 
          source={{ html: razorpayHtml }} 
          onMessage={onPaymentMessage}
          style={styles.webview}
          startInLoadingState={true}
        />
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
    backgroundColor: '#4f46e5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  customerDetailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -40,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 24,
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
    marginRight: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  dueDateLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
  },
  section: {
    marginBottom: 24,
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
    shadowColor: '#000',
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
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    backgroundColor: '#f5f3ff',
    borderColor: '#4f46e5',
  },
  methodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  selectedPaymentMethodText: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  paymentCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
});