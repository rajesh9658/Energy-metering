import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function ReportScreen() {
  const reportOptions = [
    { title: 'Daily Report', icon: '📅', description: 'View daily consumption' },
    { title: 'Weekly Report', icon: '📆', description: 'Weekly analysis' },
    { title: 'Monthly Report', icon: '📊', description: 'Monthly statistics' },
    { title: 'Yearly Report', icon: '📈', description: 'Annual overview' },
    { title: 'Billing History', icon: '🧾', description: 'Past bills' },
    { title: 'Export Data', icon: '📤', description: 'Download reports' },
  ];

  const recentReports = [
    { date: '2025-12-05', type: 'Daily', consumption: '8.5 kWh' },
    { date: '2025-12-04', type: 'Daily', consumption: '9.2 kWh' },
    { date: '2025-11-30', type: 'Weekly', consumption: '65.3 kWh' },
    { date: '2025-11-01', type: 'Monthly', consumption: '285.7 kWh' },
  ];

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>View and analyze your energy usage</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Reports</Text>
        
        <View style={styles.gridContainer}>
          {reportOptions.map((report, index) => (
            <TouchableOpacity key={index} style={styles.reportCard}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDescription}>{report.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentReports}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          
          {recentReports.map((report, index) => (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportInfo}>
                <Text style={styles.reportDate}>{report.date}</Text>
                <Text style={styles.reportType}>{report.type} Report</Text>
              </View>
              <View style={styles.consumptionContainer}>
                <Text style={styles.consumptionText}>{report.consumption}</Text>
                <Text style={styles.consumptionLabel}>Consumption</Text>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Month Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>9.0 kWh</Text>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>65.3 kWh</Text>
              <Text style={styles.summaryLabel}>This Week</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>285.7 kWh</Text>
              <Text style={styles.summaryLabel}>This Month</Text>
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
  reportCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  reportDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentReports: {
    marginBottom: 30,
  },
  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  consumptionContainer: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  consumptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  consumptionLabel: {
    fontSize: 12,
    color: '#666',
  },
  viewButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#c8e6c9',
  },
});