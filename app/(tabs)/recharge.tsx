import React, { useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';


const { width, height } = Dimensions.get('window');

// Main Recharge Screen
export default function RechargeScreen() {
  const [selectedAmount, setSelectedAmount] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [slideAnimation] = useState(new Animated.Value(0));
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  
  // Customer details from uploaded image
  const customerDetails = {
    accountId: '0129665248',
    name: 'Sanjay Gupta',
    meterNo: '9549678',
    availableBalance: '₹ 1,250.50' // You can update this dynamically
  };

  const rechargeOptions = [
    { amount: 1000, description: 'Quick Top-up' },
    { amount: 2000, description: 'Daily Use' },
    { amount: 3000, description: 'Weekly Pack' },
    { amount: 4000, description: 'Monthly Pack' },
    { amount: 5000, description: 'Family Pack' },
    { amount: 10000, description: 'Heavy Usage' },
  ];

 

  const handleSlideToPay = () => {
  if (!selectedAmount) {
    Alert.alert('Select Amount');
    return;
  }

  Animated.timing(slideAnimation, {
    toValue: width - 80,
    duration: 500,
    useNativeDriver: true,
  }).start(() => {
    slideAnimation.setValue(0);
    handlePayment(); // ✅ OPEN RAZORPAY AFTER SLIDE
  });
};
// rzp_test_S2t1onSDtI24BI


const generateFakeOrderId = () => {
  return (
    'order_' +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
};


// const createOrder = async () => {
//   const totalAmount = Math.round((Number(selectedAmount) + 10 + 1.8) * 100);

//   const res = await fetch(
//   'http://192.168.68.126:8000/api/razorpay/create-order',
//   {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json',
//     },
//     body: JSON.stringify({ amount: totalAmount }),
//   }
// );


//   return res.json();
// };

// const handlePayment = async () => {
//   try {
//     const order = await createOrder();

//     if (!order.success) {
//       Alert.alert('Order creation failed');
//       return;
//     }

//     const options = {
//       key: order.razorpay_key,
//       amount: order.amount,
//       currency: order.currency,
//       order_id: order.order_id, // 🔥 REQUIRED
//       name: 'Meter Recharge',
//       description: 'Test Recharge',
//       prefill: {
//         name: 'Test User',
//         email: 'test@razorpay.com',
//         contact: '9999999999',
//       },
//       theme: { color: '#1e88e5' },
//     };

//     RazorpayCheckout.open(options)
//       .then((data) => {
//         Alert.alert(
//           'Success',
//           data.razorpay_payment_id
//         );
//       })
//       .catch((err) => {
//         console.log('Payment Failed', err);
//         Alert.alert('Payment Failed');
//       });
//   } catch (e) {
//     console.log(e);
//     Alert.alert('Something went wrong');
//   }
// };


const handlePayment = async () => {
  try {
    if (!selectedAmount) {
      Alert.alert('Select Amount');
      return;
    }

    const grandTotal = Math.round((selectedAmount + 10 + 1.8) * 100); // paise
    // const fakeOrderId = generateFakeOrderId();

    const options = {
      key: 'rzp_test_S2t1onSDtI24BI', 
      amount: 30000,
      currency: 'INR',
      order_id: 'order_S3INqtLifINS8z', 
      name: 'Meter Recharge',
      description: 'Sochiot ',
      prefill: {
        name: 'gaurav.kumar@example.com',
        email: 'test@razorpay.com',
        contact: '9999999999',
      },
      theme: { color: '#1e88e5' },
    };

    //RazorpayCheckout.open(options)
      //.then((data) => {
       // Alert.alert(
        //  'Payment Success',
        //  `Payment ID: ${data.razorpay_payment_id}\nOrder ID: ${order_id}`
       // );

        
    //  })

      RazorpayCheckout.open(options).then((data) => {
    // handle success
    alert(`Success: ${data.razorpay_payment_id}`);
  })

     // .catch((error) => {
       // console.log('Payment Failed:', error);
      //  Alert.alert('Payment Cancelled');
     // });

      .catch((error) => {
    // handle failure
    //alert(`Error: ${error.code} | ${error.description}`);
console.log("Razorpay Error Object:", error);
  alert(JSON.stringify(error));


  });



  } catch (err) {
    console.log(err);
    Alert.alert('Something went wrong');
  }
};



  // Numpad Functions
  const handleNumpadPress = (value) => {
    if (value === 'backspace') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else if (value === 'clear') {
      setNumpadValue('');
    } else if (value === 'done') {
      const numAmount = parseFloat(numpadValue);
      if (numAmount >= 100 && numAmount <= 50000) {
        setSelectedAmount(numAmount);
        setPaymentAmount(numpadValue);
        setShowNumpad(false);
      } else {
        Alert.alert('Invalid Amount', 'Amount must be between ₹100 and ₹50,000');
      }
    } else {
      // Limit to 5 digits (max 50000)
      if (numpadValue.length < 5) {
        setNumpadValue(prev => prev + value);
      }
    }
  };

  const handleCustomAmount = () => {
    setNumpadValue(selectedAmount ? selectedAmount.toString() : '');
    setShowNumpad(true);
  };

  const calculateGrandTotal = () => {
    if (!paymentAmount || isNaN(paymentAmount)) return 0;
    const amount = parseFloat(paymentAmount);
    return amount + 10 + 1.80;
  };

  

  return (
    <>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          
        </View>

        <View style={styles.content}>
          {/* CUSTOMER DETAILS FROM UPLOADED IMAGE */}
          <View style={styles.customerDetailsCard}>
            <Text style={styles.customerDetailsTitle}>📋 Customer Details</Text>
            <View style={styles.customerDetailRow}>
              <Text style={styles.customerDetailLabel}>Account ID:</Text>
              <Text style={styles.customerDetailValue}>{customerDetails.accountId}</Text>
            </View>
            <View style={styles.customerDetailRow}>
              <Text style={styles.customerDetailLabel}>Name:</Text>
              <Text style={styles.customerDetailValue}>{customerDetails.name}</Text>
            </View>
            <View style={styles.customerDetailRow}>
              <Text style={styles.customerDetailLabel}>Meter No:</Text>
              <Text style={styles.customerDetailValue}>{customerDetails.meterNo}</Text>
            </View>
            <View style={styles.customerDetailRow}>
              <Text style={styles.customerDetailLabel}>Available Balance:</Text>
              <Text style={styles.balanceValue}>{customerDetails.availableBalance}</Text>
            </View>
          </View>

          {/* USER INFO */}
         

          {/* RECHARGE AMOUNTS */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select Recharge Amount</Text>
            <View style={styles.gridContainer}>
              {rechargeOptions.map((option, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.rechargeOptionCard,
                    selectedAmount === option.amount && styles.selectedCard
                  ]}
                  onPress={() => setSelectedAmount(selectedAmount === option.amount ? null : option.amount)}
                  activeOpacity={0.7}
                >
                  <View style={styles.amountContainer}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                    <Text style={[
                      styles.amountText,
                      selectedAmount === option.amount && styles.selectedAmountText
                    ]}>
                      {option.amount}
                    </Text>
                  </View>
                  <Text style={styles.descriptionText}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* CUSTOM AMOUNT */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Custom Amount</Text>
            <TouchableOpacity 
              style={styles.customAmountCard}
              onPress={handleCustomAmount}
              activeOpacity={0.8}
            >
              <View style={styles.customInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.customInput}>
                  {selectedAmount ? selectedAmount.toLocaleString() : 'Tap to enter amount'}
                </Text>
                <TouchableOpacity 
                  style={styles.numpadIcon}
                  onPress={handleCustomAmount}
                >
                  <Text style={styles.numpadIconText}>⌨️</Text>
                  <Text style={styles.numpadIconSubtext}>Tap</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            <Text style={styles.amountNote}>Minimum ₹100 | Maximum ₹50,000</Text>
          </View>

          {/* SELECTED AMOUNT DISPLAY */}
          {selectedAmount && (
            <View style={styles.selectedAmountContainer}>
              <Text style={styles.selectedAmountLabel}>Selected Amount:</Text>
              <Text style={styles.selectedAmountValue}>₹ {selectedAmount.toLocaleString()}</Text>
            </View>
          )}

          {/* SLIDE TO PAY - DISABLED WHEN NO AMOUNT SELECTED */}
          <View style={styles.sectionContainer}>
            <Text onPress={handlePayment} style={styles.sectionTitle}>
              Slide to Pay
            </Text>
            <View style={styles.slideContainer}>
              <View style={[styles.slideTrack, !selectedAmount && styles.disabledSlideTrack]}>
                <Animated.View 
                  style={[
                    styles.slideThumb,
                    { transform: [{ translateX: slideAnimation }] },
                    !selectedAmount && styles.disabledSlideThumb
                  ]}
                />
                <TouchableOpacity
                  style={styles.slideArea}
                  onPressIn={selectedAmount ? handleSlideToPay : null}
                  activeOpacity={1}
                  disabled={!selectedAmount}
                >
                  <Text style={[styles.slideText, !selectedAmount && styles.disabledSlideText]}>
                    {selectedAmount ? 'Slide to Recharge →' : 'Select Amount First'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PAY BUTTON (Alternative) */}
            <TouchableOpacity 
              style={[
                styles.payButton,
                !selectedAmount && styles.disabledButton
              ]}
              onPress={handleSlideToPay}
              disabled={!selectedAmount}
              activeOpacity={0.8}
            >
              <Text style={styles.payButtonText}>
                {selectedAmount ? `Pay ₹${selectedAmount.toLocaleString()}` : 'Select Amount First'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* PAYMENT INFO */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Payment Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Token Charge:</Text>
              <Text style={styles.infoValue}>₹ 10.00</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IGST (18%):</Text>
              <Text style={styles.infoValue}>₹ 1.80</Text>
            </View>
            {selectedAmount && (
              <View style={[styles.infoRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalValue}>
                  ₹ {(selectedAmount + 10 + 1.80).toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* BOTTOM GAP */}
          <View style={styles.bottomGap} />
        </View>
      </ScrollView>

      {/* NUMPAD MODAL */}
      <Modal
        visible={showNumpad}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={() => setShowNumpad(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.numpadContainer}>
                <View style={styles.numpadHeader}>
                  <Text style={styles.numpadTitle}>Enter Amount (₹)</Text>
                  <TouchableOpacity onPress={() => setShowNumpad(false)}>
                    <Text style={styles.numpadClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.numpadDisplay}>
                  <Text style={styles.numpadCurrency}>₹</Text>
                  <Text style={styles.numpadAmount}>
                    {numpadValue || '0'}
                  </Text>
                </View>

                <View style={styles.numpadGrid}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.numpadKey,
                        item === 'backspace' && styles.numpadSpecialKey
                      ]}
                      onPress={() => handleNumpadPress(item)}
                      activeOpacity={0.7}
                    >
                      {item === 'backspace' ? (
                        <Text style={styles.numpadSpecialText}>⌫</Text>
                      ) : (
                        <Text style={styles.numpadKeyText}>{item}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.numpadActions}>
                  <TouchableOpacity 
                    style={styles.numpadActionClear}
                    onPress={() => handleNumpadPress('clear')}
                  >
                    <Text style={styles.numpadActionText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.numpadActionDone}
                    onPress={() => handleNumpadPress('done')}
                    disabled={!numpadValue || parseFloat(numpadValue) < 100}
                  >
                    <Text style={styles.numpadActionDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}



const styles = StyleSheet.create({
  // Main Screen Styles
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
   
    marginBottom: 25,
    // shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.95,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  // Customer Details Styles
  customerDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  customerDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e88e5',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  customerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  customerDetailLabel: {
    fontSize: 14,
    color: '#546e7a',
    fontWeight: '500',
  },
  customerDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4caf50',
  },
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  userInfoLabel: {
    fontSize: 16,
    color: '#546e7a',
    fontWeight: '500',
  },
  userInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e88e5',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  rechargeOptionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    marginBottom: 15,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#1e88e5',
    backgroundColor: '#f0f9ff',
    shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2e7d32',
    marginRight: 4,
  },
  amountText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2e7d32',
  },
  selectedAmountText: {
    color: '#1e88e5',
  },
  descriptionText: {
    fontSize: 14,
    color: '#78909c',
    textAlign: 'center',
    fontWeight: '500',
  },
  customAmountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e8f4fd',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2e7d32',
    marginRight: 12,
  },
  customInput: {
    fontSize: 28,
    color: '#263238',
    flex: 1,
    fontWeight: '700',
    letterSpacing: 1,
  },
  numpadIcon: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  numpadIconText: {
    fontSize: 20,
  },
  numpadIconSubtext: {
    fontSize: 10,
    color: '#1e88e5',
    fontWeight: '600',
  },
  amountNote: {
    fontSize: 14,
    color: '#78909c',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedAmountContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  selectedAmountLabel: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  selectedAmountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2e7d32',
  },
  slideContainer: {
    marginBottom: 20,
  },
  slideTrack: {
    backgroundColor: '#e3f2fd',
    borderRadius: 50,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  disabledSlideTrack: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  slideArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideThumb: {
    position: 'absolute',
    left: 12,
    width: 48,
    height: 48,
    backgroundColor: '#1e88e5',
    borderRadius: 24,
    shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  disabledSlideThumb: {
    backgroundColor: '#bdbdbd',
    shadowColor: '#9e9e9e',
  },
  slideText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e88e5',
    letterSpacing: 1.5,
  },
  disabledSlideText: {
    color: '#9e9e9e',
  },
  payButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  disabledButton: {
    backgroundColor: '#cfd8dc',
    shadowColor: '#b0bec5',
    borderColor: '#b0bec5',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#bbdefb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e88e5',
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e3f2fd',
  },
  infoLabel: {
    fontSize: 16,
    color: '#546e7a',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  grandTotalRow: {
    borderBottomWidth: 0,
    paddingTop: 15,
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e88e5',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2e7d32',
  },

  // Payment Screen Styles
  paymentScrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  paymentHeader: {
    backgroundColor: '#1e88e5',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 25,
    shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  paymentHeaderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  paymentContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  paymentDetailLabel: {
    fontSize: 16,
    color: '#546e7a',
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#78909c',
    marginBottom: 16,
    fontWeight: '500',
  },
  amountInputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
    marginBottom: 15,
  },
  inputCurrencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2e7d32',
    marginRight: 12,
  },
  amountInput: {
    fontSize: 32,
    color: '#263238',
    flex: 1,
    fontWeight: '700',
    letterSpacing: 1,
    paddingVertical: 5,
  },
  gatewayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  gatewayCard: {
    width: (width - 72) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    position: 'relative',
  },
  selectedGatewayCard: {
    backgroundColor: '#f8fdff',
    shadowColor: '#1e88e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  gatewayIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gatewayIconText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  gatewayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#4caf50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedCheckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#546e7a',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  confirmPayButton: {
    backgroundColor: '#4caf50',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#388e3c',
    marginTop: 20,
    marginBottom: 30,
  },
  confirmPayButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  confirmPayButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    fontWeight: '500',
  },
  securityInfo: {
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#c5e1a5',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33691e',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#558b2f',
    marginBottom: 6,
    fontWeight: '500',
  },

  // BOTTOM GAP
  bottomGap: {
    height: 30, // Extra gap at bottom
  },

  // Numpad Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  numpadContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  numpadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  numpadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e88e5',
  },
  numpadClose: {
    fontSize: 24,
    fontWeight: '700',
    color: '#78909c',
    padding: 5,
  },
  numpadDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e3f2fd',
  },
  numpadCurrency: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2e7d32',
    marginRight: 10,
  },
  numpadAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#263238',
    letterSpacing: 2,
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numpadKey: {
    width: (width - 80) / 3,
    height: 60,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  numpadSpecialKey: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  numpadKeyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#263238',
  },
  numpadSpecialText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f44336',
  },
  numpadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  numpadActionClear: {
    flex: 1,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  numpadActionDone: {
    flex: 2,
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#388e3c',
  },
  numpadActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f44336',
  },
  numpadActionDoneText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
});