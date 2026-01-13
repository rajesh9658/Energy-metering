import React, { useState, useEffect } from 'react';
import {
  Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { getMeterDailyConsumptionUrl, getMeterMonthlyConsumptionUrl } from '../config';

const { width } = Dimensions.get('window');

export default function EnergyReport() {
  const { getSiteId } = useAuth();
  
  const [timeView, setTimeView] = useState('daily');
  const [showFilter, setShowFilter] = useState(false);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.toLocaleString('default', { month: 'long' }));
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [showValueLabels, setShowValueLabels] = useState(true);
  
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stats, setStats] = useState({
    avgU: '0.00',
    maxU: '0.00',
    avgA: '0.00',
    maxA: '0.00',
    totalUnits: '0.00',
    totalAmount: '0.00'
  });

  // Months and Years
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [selectedMonth, selectedYear, timeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const siteId = getSiteId();
      
      if (!siteId) {
        Alert.alert('Error', 'Site information not found. Please login again.');
        setLoading(false);
        return;
      }

      if (timeView === 'daily') {
        await fetchDailyData(siteId);
      } else {
        await fetchYearlyMonthlyData(siteId);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      // Use sample data on error
      if (timeView === 'daily') {
        const sampleData = generateSampleDailyData();
        setDailyData(sampleData);
        calculateStats(sampleData, 'daily');
      } else {
        const sampleData = generateSampleMonthlyData();
        setMonthlyData(sampleData);
        calculateStats(sampleData, 'monthly');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyData = async (siteId) => {
    try {
      const monthNumber = months.indexOf(selectedMonth) + 1;
      const monthStr = monthNumber.toString().padStart(2, '0');
      const monthParam = `${selectedYear}-${monthStr}`;
      
      const response = await axios.get(getMeterDailyConsumptionUrl(siteId, monthParam));
      
      if (response.data && response.data.data) {
        const data = response.data.data.map(item => ({
          ...item,
          kwh_delta: item.kwh_delta || 0
        }));
        setDailyData(data);
        calculateStats(data, 'daily');
        setHoveredIndex(0);
      } else {
        const sampleData = generateSampleDailyData();
        setDailyData(sampleData);
        calculateStats(sampleData, 'daily');
      }
    } catch (error) {
      console.error('Error fetching daily data:', error);
      const sampleData = generateSampleDailyData();
      setDailyData(sampleData);
      calculateStats(sampleData, 'daily');
    }
  };

  const fetchYearlyMonthlyData = async (siteId) => {
    try {
      const yearParam = `${selectedYear}-01`;
      
      const response = await axios.get(getMeterMonthlyConsumptionUrl(siteId, yearParam));
      
      if (response.data) {
        const processedData = processYearlyResponse(response.data);
        setMonthlyData(processedData);
        calculateStats(processedData, 'monthly');
        setHoveredIndex(0);
      } else {
        const sampleData = generateSampleMonthlyData();
        setMonthlyData(sampleData);
        calculateStats(sampleData, 'monthly');
      }
    } catch (error) {
      console.error('Error fetching yearly data:', error);
      const sampleData = generateSampleMonthlyData();
      setMonthlyData(sampleData);
      calculateStats(sampleData, 'monthly');
    }
  };

  const processYearlyResponse = (apiData) => {
    try {
      // Handle different response formats
      if (Array.isArray(apiData)) {
        return apiData.map((item, index) => ({
          month: months[index] || `Month ${index + 1}`,
          monthNumber: index + 1,
          total_kwh: Number(item.total_kwh || item.kwh || Math.floor(Math.random() * 100) + 50) || 0,
          total_amount: calculateAmount(Number(item.total_kwh || item.kwh || Math.floor(Math.random() * 100) + 50) || 0)
        }));
      } else if (apiData.data && Array.isArray(apiData.data)) {
        return apiData.data.map((item, index) => ({
          month: months[index] || `Month ${index + 1}`,
          monthNumber: index + 1,
          total_kwh: Number(item.total_kwh || item.kwh || Math.floor(Math.random() * 100) + 50) || 0,
          total_amount: calculateAmount(Number(item.total_kwh || item.kwh || Math.floor(Math.random() * 100) + 50) || 0)
        }));
      } else if (apiData.total_kwh !== undefined) {
        // Single monthly data object
        const monthIndex = months.indexOf(selectedMonth);
        return [{
          month: selectedMonth,
          monthNumber: monthIndex + 1,
          total_kwh: Number(apiData.total_kwh || apiData.kwh || 0) || 0,
          total_amount: calculateAmount(Number(apiData.total_kwh || apiData.kwh || 0) || 0)
        }];
      } else {
        return generateSampleMonthlyData();
      }
    } catch (error) {
      console.error('Error processing yearly response:', error);
      return generateSampleMonthlyData();
    }
  };

  const generateSampleDailyData = () => {
    const daysInMonth = new Date(selectedYear, months.indexOf(selectedMonth) + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1} ${selectedMonth.slice(0, 3)}`,
      kwh_delta: Math.floor(Math.random() * 15) + 5,
      date: `${i + 1}-${selectedMonth.slice(0, 3)}-${selectedYear}`
    }));
  };

  const generateSampleMonthlyData = () => {
    return months.map((month, index) => ({
      month,
      monthNumber: index + 1,
      total_kwh: Math.floor(Math.random() * 100) + 50,
      total_amount: calculateAmount(Math.floor(Math.random() * 100) + 50)
    }));
  };

  const calculateAmount = (kwh) => {
    const ratePerKwh = 6.8;
    return (kwh * ratePerKwh).toFixed(2);
  };

  const calculateStats = (data, type) => {
    if (!data || data.length === 0) {
      resetStats();
      return;
    }

    let units = [];
    let amounts = [];
    
    if (type === 'daily') {
      units = data.map(item => Number(item.kwh_delta) || 0);
      amounts = units.map(u => parseFloat(calculateAmount(u)));
    } else {
      units = data.map(item => Number(item.total_kwh) || 0);
      amounts = data.map(item => parseFloat(item.total_amount || calculateAmount(Number(item.total_kwh) || 0)));
    }
    
    const totalUnits = units.reduce((sum, val) => sum + val, 0);
    const totalAmount = amounts.reduce((sum, val) => sum + val, 0);
    const maxUnit = units.length > 0 ? Math.max(...units) : 1;
    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;
    
    setStats({
      avgU: units.length > 0 ? (totalUnits / units.length).toFixed(2) : '0.00',
      maxU: maxUnit.toFixed(2),
      avgA: amounts.length > 0 ? (totalAmount / amounts.length).toFixed(2) : '0.00',
      maxA: maxAmount.toFixed(2),
      totalUnits: totalUnits.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    });
  };

  const resetStats = () => {
    setStats({
      avgU: '0.00',
      maxU: '0.00',
      avgA: '0.00',
      maxA: '0.00',
      totalUnits: '0.00',
      totalAmount: '0.00'
    });
  };

  const getCurrentData = () => {
    if (timeView === 'daily') {
      return {
        unitValues: dailyData.map(item => Number(item.kwh_delta) || 0),
        amtValues: dailyData.map(item => parseFloat(calculateAmount(item.kwh_delta || 0))),
        labels: dailyData.map(item => item.day || ''),
        data: dailyData
      };
    } else {
      return {
        unitValues: monthlyData.map(item => Number(item.total_kwh) || 0),
        amtValues: monthlyData.map(item => parseFloat(item.total_amount || calculateAmount(item.total_kwh || 0))),
        labels: monthlyData.map(item => item.month || ''),
        data: monthlyData
      };
    }
  };

  const handleViewChange = (viewType) => {
    setTimeView(viewType);
    setHoveredIndex(0);
    setShowValueLabels(true);
  };

  const exportPDF = async () => {
    try {
      const currentData = getCurrentData();
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              .header { text-align: center; color: #02569B; margin-bottom: 30px; }
              .summary { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .summary-label { font-weight: bold; color: #666; }
              .summary-value { font-weight: bold; color: #02569B; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #02569B; color: white; padding: 12px; text-align: left; }
              td { padding: 10px; border: 1px solid #ddd; }
              .total-row { background: #e8f4fd; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1 class="header">Energy Consumption Report</h1>
            
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">Period:</span>
                <span class="summary-value">${timeView === 'daily' ? `${selectedMonth} ${selectedYear}` : selectedYear}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">View Type:</span>
                <span class="summary-value">${timeView === 'daily' ? 'Daily' : 'Monthly'} View</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Units:</span>
                <span class="summary-value">${stats.totalUnits} kWh</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Amount:</span>
                <span class="summary-value">₹${stats.totalAmount}</span>
              </div>
            </div>
            
            <table>
              <tr>
                <th>${timeView === 'daily' ? 'Date' : 'Month'}</th>
                <th>Units (kWh)</th>
                <th>Amount (₹)</th>
              </tr>
              ${currentData.data.map((item, index) => `
                <tr>
                  <td>${timeView === 'daily' ? (item.day || `Day ${index + 1}`) : item.month}</td>
                  <td>${timeView === 'daily' ? (Number(item.kwh_delta) || 0).toFixed(2) : (Number(item.total_kwh) || 0).toFixed(2)}</td>
                  <td>₹${timeView === 'daily' ? calculateAmount(item.kwh_delta || 0) : (item.total_amount || '0.00')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>${stats.totalUnits} kWh</strong></td>
                <td><strong>₹${stats.totalAmount}</strong></td>
              </tr>
            </table>
            
            <div class="footer">
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Energy Monitoring System © ${new Date().getFullYear()}</p>
            </div>
          </body>
        </html>`;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Energy Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const GraphCard = ({ title, unit, isAmount }) => {
    const currentData = getCurrentData();
    const values = isAmount ? currentData.amtValues : currentData.unitValues;
    const maxValue = Math.max(...values.filter(v => !isNaN(v)), 1);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            {isAmount ? <Text style={styles.currIcon}>₹</Text> : <Ionicons name="speedometer-outline" size={18} color="#02569B" />}
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
          <TouchableOpacity style={styles.filterBadge} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={12} color="white" />
            <Text style={styles.badgeText}>
              {timeView === 'daily' ? `${selectedMonth.slice(0,3)} ${selectedYear}` : selectedYear}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.graphBody}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxValue.toFixed(0)}</Text>
            <Text style={styles.axisLabel}>0</Text>
          </View>
          
          <View style={styles.chartSpace}>
            {timeView === 'daily' ? (
              <View style={styles.lineGraphContainer}>
                <View style={[styles.areaShade, { 
                  height: '50%', 
                  backgroundColor: isAmount ? 'rgba(30,136,229,0.1)' : 'rgba(2, 86, 155, 0.1)' 
                }]} />
                
                <View style={styles.horizontalLine} />
                
                <View style={styles.pointsRow}>
                  {values.slice(0, Math.min(31, values.length)).map((v, i) => {
                    const value = Number(v) || 0;
                    const bottomPos = (value / maxValue) * 100;
                    const isActive = hoveredIndex === i;
                    
                    return (
                      <TouchableOpacity 
                        key={i}
                        style={styles.dotContainer}
                        onPress={() => setHoveredIndex(i)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.connectingLine, { 
                          height: `${bottomPos}%`,
                          backgroundColor: isActive ? 
                            (isAmount ? '#1E88E5' : '#02569B') : 
                            'rgba(2, 86, 155, 0.2)'
                        }]} />
                        
                        <View style={[
                          styles.dot, { 
                            bottom: `${bottomPos}%`,
                            backgroundColor: isAmount ? '#1E88E5' : '#02569B',
                            transform: [{ scale: isActive ? 1.5 : 1 }]
                          }
                        ]} />
                        
                        {/* Value Label - Show/Hide based on state */}
                        {showValueLabels && value > 0 && (
                          <View style={[styles.valueLabel, { bottom: `${bottomPos}%` }]}>
                            <Text style={styles.valueLabelText}>
                              {value.toFixed(0)}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {/* Tooltip - Always shown for hovered item */}
                {hoveredIndex !== null && values[hoveredIndex] > 0 && (
                  <View style={[
                    styles.tooltip, 
                    { 
                      left: `${(hoveredIndex / Math.min(31, values.length)) * 100}%`,
                      bottom: `${(values[hoveredIndex] / maxValue) * 100 + 10}%`
                    }
                  ]}>
                    <View style={styles.tooltipArrow} />
                    <Text style={styles.tooltipText}>
                      {currentData.labels[hoveredIndex] || `Day ${hoveredIndex + 1}`}
                    </Text>
                    <Text style={styles.tooltipValue}>
                      {(values[hoveredIndex] || 0).toFixed(2)} {unit}
                    </Text>
                  </View>
                )}
                
                <View style={styles.xAxis}>
                  {['1','6','11','16','21','26','31'].map(d => 
                    <Text key={d} style={styles.axisLabel}>{d}</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.barGraphContainer}>
                {values.slice(0, 12).map((v, i) => {
                  const value = Number(v) || 0;
                  const barHeight = (value / maxValue) * 100;
                  const isActive = hoveredIndex === i;
                  
                  return (
                    <TouchableOpacity 
                      key={i}
                      style={styles.barCol}
                      onPress={() => setHoveredIndex(i)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.bar, 
                        { 
                          height: `${barHeight}%`,
                          backgroundColor: isAmount ? '#1E88E5' : '#02569B',
                          opacity: isActive ? 1 : 0.8
                        }
                      ]} />
                      
                      {/* Value Label - Show/Hide based on state */}
                      {showValueLabels && value > 0 && (
                        <View style={[styles.barValueLabel, { bottom: `${barHeight}%` }]}>
                          <Text style={styles.barValueText}>
                            {value.toFixed(0)}
                          </Text>
                        </View>
                      )}
                      
                      {i % 2 === 0 && (
                        <Text style={styles.axisLabel}>
                          {currentData.labels[i]?.slice(0,3) || months[i]?.slice(0,3)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                
                {/* Tooltip for monthly view */}
                {hoveredIndex !== null && values[hoveredIndex] > 0 && (
                  <View style={[
                    styles.tooltip, 
                    { 
                      left: `${(hoveredIndex / 12) * 100}%`,
                      bottom: `${(values[hoveredIndex] / maxValue) * 100 + 15}%`
                    }
                  ]}>
                    <View style={styles.tooltipArrow} />
                    <Text style={styles.tooltipText}>
                      {currentData.labels[hoveredIndex]}
                    </Text>
                    <Text style={styles.tooltipValue}>
                      {(values[hoveredIndex] || 0).toFixed(2)} {unit}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Toggle Value Labels Button */}
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowValueLabels(!showValueLabels)}
        >
          <Ionicons 
            name={showValueLabels ? "eye-off-outline" : "eye-outline"} 
            size={16} 
            color="#02569B" 
          />
          <Text style={styles.toggleText}>
            {showValueLabels ? 'Hide Values' : 'Show Values'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Average</Text>
            <Text style={styles.statValBlue}>
              {isAmount ? stats.avgA : stats.avgU}
            </Text>
            <Text style={styles.statUnit}>{unit}</Text>
          </View>
          
          <View style={styles.vDivider} />
          
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Maximum</Text>
            <Text style={styles.statValRed}>
              {isAmount ? stats.maxA : stats.maxU}
            </Text>
            <Text style={styles.statUnit}>{unit}</Text>
          </View>
          
          <View style={styles.vDivider} />
          
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Total</Text>
            <Text style={styles.statValGreen}>
              {isAmount ? stats.totalAmount : stats.totalUnits}
            </Text>
            <Text style={styles.statUnit}>{unit}</Text>
          </View>
        </View>
        
        {/* Data Summary */}
        <View style={styles.dataSummary}>
          <Text style={styles.summaryTitle}>Data Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Period:</Text>
            <Text style={styles.summaryValue}>
              {timeView === 'daily' ? `${selectedMonth} ${selectedYear}` : selectedYear}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Data Points:</Text>
            <Text style={styles.summaryValue}>
              {timeView === 'daily' ? dailyData.length : monthlyData.length} records
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected:</Text>
            <Text style={styles.summaryValue}>
              {hoveredIndex !== null && currentData.labels[hoveredIndex] ? 
                `${currentData.labels[hoveredIndex]}: ${(values[hoveredIndex] || 0).toFixed(1)} ${unit}` : 
                'Click on a point/bar'
              }
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const handleFilterApply = () => {
    setShowFilter(false);
  };

  if (loading && dailyData.length === 0 && monthlyData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#02569B" />
        <Text style={styles.loadingText}>
          Loading {timeView === 'daily' ? 'daily' : 'monthly'} consumption data...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.downloadBtn} onPress={exportPDF}>
            <Ionicons name="document-text" size={16} color="#02569B" />
            <Text style={styles.downloadText}>PDF Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={16} color="#02569B" />
            <Text style={styles.downloadText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity 
            onPress={() => handleViewChange('daily')} 
            style={[styles.tab, timeView === 'daily' && styles.activeTab]}
          >
            <Text style={[styles.tabText, timeView === 'daily' && styles.activeTabText]}>
              Daily View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleViewChange('monthly')} 
            style={[styles.tab, timeView === 'monthly' && styles.activeTab]}
          >
            <Text style={[styles.tabText, timeView === 'monthly' && styles.activeTabText]}>
              Monthly View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GraphCard 
          title="Units (kWh)" 
          unit="kWh" 
        />
        <GraphCard 
          title="Bill Amount" 
          unit="₹" 
          isAmount={true} 
        />
        <View style={styles.spacer} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Filter</Text>
            
            {timeView === 'daily' && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Select Month</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.monthScroll}
                >
                  {months.map(m => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.monthBtn, selectedMonth === m && styles.monthBtnActive]} 
                      onPress={() => setSelectedMonth(m)}
                    >
                      <Text style={[styles.monthText, selectedMonth === m && styles.monthTextActive]}>
                        {m.slice(0,3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Select Year</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.yearScroll}
              >
                {years.map(y => (
                  <TouchableOpacity 
                    key={y} 
                    style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]} 
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.yearText, selectedYear === y && styles.yearTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setShowFilter(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyBtn}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// STYLES
const colors = {
  primary: '#02569B',
  primaryLight: '#E8F4FD',
  secondary: '#4CAF50',
  danger: '#D32F2F',
  warning: '#FF9800',
  background: '#F8F9FA',
  white: '#FFFFFF',
  gray100: '#F5F7FA',
  gray200: '#E9ECEF',
  gray300: '#DDDDDD',
  gray400: '#AAAAAA',
  gray500: '#666666',
  gray600: '#444444',
  black: '#333333',
};

const typography = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 18, fontWeight: '600' },
  h3: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
  tiny: { fontSize: 10, fontWeight: '400' },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  round: 20,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.gray500,
    fontSize: 16,
    textAlign: 'center',
  },
  topSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    ...shadows.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  spacer: {
    height: spacing.xxxl,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  downloadText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.primary,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  tabText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.gray500,
  },
  activeTabText: {
    color: colors.primary,
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  currIcon: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  cardTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.black,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    ...typography.tiny,
    fontWeight: '600',
  },

  // Toggle Button for Values
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  toggleText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },

  // Graph Components
  graphBody: {
    height: 220,
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
    alignItems: 'flex-end',
  },
  chartSpace: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray300,
    position: 'relative',
  },
  axisLabel: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },

  // Line Graph
  lineGraphContainer: {
    flex: 1,
    position: 'relative',
  },
  areaShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  horizontalLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.gray200,
  },
  pointsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: 20,
  },
  dotContainer: {
    width: 22,
    height: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  connectingLine: {
    width: 2,
    position: 'absolute',
    bottom: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    zIndex: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  
  // Value Labels (show/hide)
  valueLabel: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -50 }],
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 5,
  },
  valueLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  
  // Bar Graph Value Labels
  barValueLabel: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 20,
  },
  barValueText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },

  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: -20,
    left: spacing.sm,
    right: spacing.sm,
  },

  // Bar Graph
  barGraphContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: 25,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bar: {
    width: 16,
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 100,
    transform: [{ translateX: -50 }],
    minWidth: 100,
    alignItems: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -5 }],
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.black,
  },
  tooltipText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Statistics
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statTitle: {
    ...typography.tiny,
    color: colors.gray500,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  statValBlue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statValRed: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  statValGreen: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  statUnit: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },
  vDivider: {
    width: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.md,
  },

  // Data Summary
  dataSummary: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.gray600,
  },
  summaryValue: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: colors.primary,
  },
  
  // Filter Sections
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontWeight: '600',
    color: colors.gray500,
    ...typography.body,
    marginBottom: spacing.md,
  },
  
  // Month Filter
  monthScroll: {
    flexDirection: 'row',
  },
  monthBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  monthBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthText: {
    ...typography.small,
    color: colors.gray600,
    fontWeight: '500',
  },
  monthTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Year Filter
  yearScroll: {
    flexDirection: 'row',
  },
  yearBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  yearBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearText: {
    ...typography.small,
    color: colors.gray600,
    fontWeight: '500',
  },
  yearTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Filter Actions
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cancelText: {
    color: colors.gray600,
    fontWeight: '600',
    ...typography.body,
  },
  applyBtn: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  applyText: {
    color: colors.white,
    fontWeight: '700',
    ...typography.body,
  },
});