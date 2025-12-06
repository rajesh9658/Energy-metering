import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export default function OverviewScreen() {
  return (
    <ScrollView style={styles.scrollView}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.meterId}># B-0001</Text>
        <Text style={styles.customerName}>Sanjay Gupta</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Overview</Text>

        {/* Grid Balance Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Grid Balance</Text>
          <Text style={styles.cardValue}>Rs. 135.61</Text>
        </View>

        {/* Grid and DG Units */}
        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardLabel}>Grid Unit</Text>
            <Text style={styles.cardValue}>11886.00 kWh</Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardLabel}>DG Unit</Text>
            <Text style={styles.cardValue}>229.79 kWh</Text>
          </View>
        </View>

        {/* Supply Status */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Supply</Text>
          <View style={styles.supplyContainer}>
            <View style={styles.supplyIndicator} />
            <Text style={styles.supplyText}>GRID</Text>
          </View>
        </View>

        {/* Last Updated */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Last Updated On</Text>
          <Text style={styles.cardValue}>2025-12-06 14:04:13</Text>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Today's Consumption */}
        <Text style={styles.sectionTitle}>Today's Consumption</Text>
        <View style={styles.consumptionCard}>
          <View style={styles.consumptionRow}>
            <View style={styles.consumptionColumn}>
              <Text style={styles.consumptionTitle}>Grid</Text>
              <Text style={styles.consumptionValue}>9.00</Text>
              <Text style={styles.consumptionUnit}>kWh</Text>
              <Text style={styles.consumptionPercentage}>100.00%</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.consumptionColumn}>
              <Text style={styles.consumptionTitle}>DG</Text>
              <Text style={styles.consumptionValue}>0.00</Text>
              <Text style={styles.consumptionUnit}>kWh</Text>
              <Text style={styles.consumptionPercentage}>0.00%</Text>
            </View>
          </View>
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
  meterId: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  supplyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4caf50',
    marginRight: 10,
  },
  supplyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 25,
  },
  consumptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consumptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  consumptionColumn: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  consumptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  consumptionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  consumptionUnit: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  consumptionPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});