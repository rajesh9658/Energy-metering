import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function RechargeScreen() {
  const rechargeOptions = [
    { amount: 'Rs. 100', description: 'Basic Pack' },
    { amount: 'Rs. 250', description: 'Weekly Pack' },
    { amount: 'Rs. 500', description: 'Monthly Pack' },
    { amount: 'Rs. 1000', description: 'Quarterly Pack' },
    { amount: 'Rs. 2000', description: 'Half Yearly' },
    { amount: 'Rs. 5000', description: 'Yearly Pack' },
  ];

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.title}>Recharge Account</Text>
        <Text style={styles.subtitle}>Current Balance: Rs. 135.61</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Recharge Amount</Text>
        
        <View style={styles.gridContainer}>
          {rechargeOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.rechargeCard}>
              <Text style={styles.amountText}>{option.amount}</Text>
              <Text style={styles.descriptionText}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.customAmountContainer}>
          <Text style={styles.sectionTitle}>Custom Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>Rs.</Text>
            <Text style={styles.customInput}>Enter Amount</Text>
          </View>
          <TouchableOpacity style={styles.rechargeButton}>
            <Text style={styles.buttonText}>Proceed to Recharge</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Recharge Information</Text>
          <Text style={styles.infoText}>
            • Recharge will be processed immediately
          </Text>
          <Text style={styles.infoText}>
            • Balance will be updated in real-time
          </Text>
          <Text style={styles.infoText}>
            • Minimum recharge amount: Rs. 100
          </Text>
          <Text style={styles.infoText}>
            • Maximum recharge amount: Rs. 10,000
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  rechargeCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
  },
  customAmountContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginRight: 10,
  },
  customInput: {
    fontSize: 18,
    color: '#999',
    flex: 1,
  },
  rechargeButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});