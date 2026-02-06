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
import { getMeterDailyConsumptionUrl, getMeterMonthlyConsumptionUrl, getYearlyConsumptionUrl, getMeterMonthlyReportUrl } from '../config';


const { width } = Dimensions.get('window');

export default function EnergyReport() {
  const { getSiteId } = useAuth();
  
  const [timeView, setTimeView] = useState('daily');
  const [showFilter, setShowFilter] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.toLocaleString('default', { month: 'long' }));
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showAllValues, setShowAllValues] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
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
    const siteId = getSiteId();
    if (!siteId) return;

    setLoading(true);
    try {
      if (timeView === 'daily') {
        await fetchDailyData(siteId);
      } else {
        await fetchYearlyMonthlyData(siteId, selectedYear);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyData = async (siteId) => {
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const monthParam = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}`;

    const response = await axios.get(
      getMeterDailyConsumptionUrl(siteId, monthParam)
    );

    const data = response.data?.data || [];
    setDailyData(data);
    calculateStats(data, 'daily');
    setHoveredIndex(null);
  };

  const fetchYearlyMonthlyData = async (siteId, year) => {
    try {
      const response = await axios.get(
        getYearlyConsumptionUrl(siteId),
        {
          params: { year },
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data) {
        const processedData = processYearlyResponse(response.data);
        setMonthlyData(processedData);
        calculateStats(processedData, 'monthly');
        setHoveredIndex(null);
      }
    } catch (error) {
      console.error('Error fetching yearly data:', error);
    }
  };

  const processYearlyResponse = (apiData) => {
    try {
      if (apiData && Array.isArray(apiData.monthly_consumption)) {
        return apiData.monthly_consumption.map((item) => {
          const kwh = Number(item.total_kwh) || 0;
          return {
            month: item.month,
            monthNumber: Number(item.month_key?.split('-')[1]) || 0,
            total_kwh: kwh,
            total_amount: calculateAmount(kwh),
          };
        });
      }
    } catch (error) {
      console.error('Error processing yearly response:', error);
    }
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
    setHoveredIndex(null);
    setShowAllValues(true);
  };

  // Summary Report (Existing)
  const exportSummaryPDF = async () => {
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

  // Detailed Monthly Report (New)
  const exportDetailedPDF = async () => {
    try {
      const siteId = getSiteId();
      if (!siteId) {
        Alert.alert('Error', 'Site ID not found');
        return;
      }

      // Format month for API (YYYY-MM format)
      const monthIndex = months.indexOf(selectedMonth) + 1;
      const monthParam = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}`;

      setIsGeneratingReport(true);

      // Fetch monthly report data from new API
      const response = await axios.get(
        getMeterMonthlyReportUrl(siteId, monthParam),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const reportData = response.data;

      if (!reportData.success || !reportData.reports) {
        Alert.alert('Error', 'No report data available');
        return;
      }

      // Prepare data for PDF
      const { meta, reports } = reportData;

      // Calculate totals
      let totalEnergy = 0;
      let totalEnergyAmount = 0;
      let totalFixed = 0;
      let totalOther = 0;
      let totalAmount = 0;

      reports.forEach(report => {
        const energyUsed = report.energy_used || 0;
        const energyAmount = report.energy_amount || 0;
        const fixedCharges = (report.fixed_mains || 0) + (report.fixed_dg || 0);
        const otherCharges = 0;
        const totalRowAmount = energyAmount + fixedCharges + otherCharges;

        totalEnergy += energyUsed;
        totalEnergyAmount += energyAmount;
        totalFixed += fixedCharges;
        totalOther += otherCharges;
        totalAmount += totalRowAmount;
      });

      // Format date for display
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');
      };

      // Current date and time for footer
      const currentDateTime = new Date();
      const generatedDate = currentDateTime.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      const generatedTime = currentDateTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Create HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Monthly Meter Report</title>
            <style>
                @page { 
                    size: A4 landscape; 
                    margin: 10mm 6mm;
                }

                body {
                    font-family: 'Arial', sans-serif;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    line-height: 1.2;
                    -webkit-print-color-adjust: exact;
                    background-color: #fff;
                }

                .container {
                    width: 100%;
                    max-width: 100%;
                    overflow: hidden;
                    padding-top: 5px;
                }

                .header {
                    display: flex;
                    align-items: center;
                    border-bottom: 1px solid #000;
                    padding: 0;
                    margin: 0 0 2px 0;
                }

                .header-title {
                    flex: 1;
                    text-align: center;
                    font-size: 20px;
                    font-weight: bold;
                    color: #1F4E79;
                    text-transform: uppercase;
                    line-height: 1;
                    margin: 0;
                    padding: 0;
                }

                .meter-info-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                    font-size: 16px;
                }

                .meter-info-table td {
                    padding: 6px 8px;
                    border: none;
                    text-align: left;
                    vertical-align: middle;
                    line-height: 1.2;
                }

                .meter-label {
                    font-weight: bold;
                    color: #000;
                    width: 18%;
                    text-align: right;
                    padding-right: 6px;
                    font-size: 12px;
                }

                .meter-separator {
                    width: 10px;
                    text-align: center;
                    font-weight: bold;
                    color: #000;
                    font-size: 16px;
                }

                .meter-value {
                    font-weight: bold;
                    color: #000;
                    padding-left: 6px;
                    font-size: 12px;
                    background-color: #fff;
                }

                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10pt;
                    table-layout: fixed;
                }

                .main-table th {
                    background-color: #1F4E79;
                    color: #fff;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 9pt;
                    padding: 5px 3px;
                    text-align: center;
                    border: 1px solid #000;
                }

                .main-table td {
                    border: 1px solid #000;
                    padding: 4px 2px;
                    text-align: center;
                    vertical-align: middle;
                    font-size: 10pt;
                    font-weight: bold;
                }

                .main-table tr:nth-child(even) { 
                    background-color: #f2f2f2; 
                }

                .numeric {
                    text-align: right;
                    padding-right: 6px;
                }

                .total-row {
                    background-color: #ccc;
                    font-weight: bold;
                    border-top: 2px solid #000;
                    font-size: 11pt;
                }

                .total-label {
                    text-align: right;
                    padding-right: 8px;
                }

                .footer {
                    margin-top: 8px;
                    padding-top: 6px;
                    border-top: 1px solid #000;
                    text-align: center;
                    font-size: 10pt;
                    font-weight: bold;
                }

                @media print {
                    * {
                        color: #000 !important;
                        font-weight: bold !important;
                    }

                    body {
                        font-size: 10pt;
                        line-height: 1.1;
                        margin-top: 4mm;
                    }

                    .meter-info-table td { font-size: 12pt !important; padding: 4px 6px !important; }
                    .main-table { font-size: 9pt !important; page-break-inside: avoid !important; }
                    .main-table th { font-size: 9pt !important; padding: 3px 2px !important; }
                    .main-table td { font-size: 8.5pt !important; padding: 2px 2px !important; }
                    tr { page-break-inside: avoid !important; }
                    table { page-break-after: avoid !important; }
                    .total-row td { font-size: 9pt !important; }
                    .footer { font-size: 8pt !important; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-title">
                        Food Valley, Lucknow (UP)
                    </div>
                </div>

                <table class="meter-info-table">
                    <tr>
                        <td class="meter-label">METER NUMBER:</td>
                        <td class="meter-value">${meta.meter_number || 'N/A'}</td>
                        <td class="meter-separator">|</td>
                        <td class="meter-label">SHOP NAME:</td>
                        <td class="meter-value">${meta.meter_name || 'N/A'}</td>
                        <td class="meter-separator">|</td>
                        <td class="meter-label">LAST UPDATED:</td>
                        <td class="meter-value">${meta.latest_reading || 'N/A'}</td>
                    </tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>METER ID</th>
                            <th>OPENING KWH</th>
                            <th>CLOSING KWH</th>
                            <th>ENERGY CONSUMED (KWH)</th>
                            <th>EB TARIFF</th>
                            <th>ENERGY AMOUNT</th>
                            <th>FIXED CHARGES</th>
                            <th>OTHER CHARGES</th>
                            <th>TOTAL AMOUNT</th>
                            <th>OPENING BALANCE</th>
                            <th>CLOSING BALANCE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.length > 0 ? 
                          reports.map(report => {
                            const energyUsed = report.energy_used || 0;
                            const energyAmount = report.energy_amount || 0;
                            const fixedCharges = (report.fixed_mains || 0) + (report.fixed_dg || 0);
                            const otherCharges = 0;
                            const totalRowAmount = energyAmount + fixedCharges + otherCharges;
                            
                            return `
                              <tr>
                                  <td class="numeric">${formatDate(report.date)}</td>
                                  <td class="numeric">${meta.meter_number || report.meter_id || ''}</td>
                                  <td class="numeric">${(report.opening_kwh || 0).toFixed(2)}</td>
                                  <td class="numeric">${(report.closing_kwh || 0).toFixed(2)}</td>
                                  <td class="numeric">${energyUsed.toFixed(2)}</td>
                                  <td class="numeric">0.00</td>
                                  <td class="numeric">${energyAmount.toFixed(2)}</td>
                                  <td class="numeric">${fixedCharges.toFixed(2)}</td>
                                  <td class="numeric">${otherCharges.toFixed(2)}</td>
                                  <td class="numeric">${totalRowAmount.toFixed(2)}</td>
                                  <td class="numeric">${(report.opening_balance || 0).toFixed(2)}</td>
                                  <td class="numeric">${(report.closing_balance || 0).toFixed(2)}</td>
                              </tr>
                            `;
                          }).join('') : 
                          `<tr><td colspan="12" style="text-align:center; font-style:italic;">No consumption data available for this period</td></tr>`
                        }

                        ${reports.length > 0 ? `
                          <tr class="total-row">
                              <td colspan="4" class="total-label">TOTAL:</td>
                              <td class="numeric">${totalEnergy.toFixed(2)}</td>
                              <td></td>
                              <td class="numeric">${totalEnergyAmount.toFixed(2)}</td>
                              <td class="numeric">${totalFixed.toFixed(2)}</td>
                              <td class="numeric">${totalOther.toFixed(2)}</td>
                              <td class="numeric">${totalAmount.toFixed(2)}</td>
                              <td colspan="2"></td>
                          </tr>
                        ` : ''}
                    </tbody>
                </table>

                <div class="footer">
                    Generated on: ${generatedDate} ${generatedTime} | Page 1 of 1
                </div>
            </div>
        </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Monthly Meter Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'Monthly report PDF generated successfully');
      }
    } catch (error) {
      console.error('Detailed PDF export error:', error);
      Alert.alert('Error', 'Failed to generate monthly report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const GraphCard = ({ title, unit, isAmount }) => {
    const currentData = getCurrentData();
    const values = isAmount ? currentData.amtValues : currentData.unitValues;
    const maxValue = Math.max(...values.filter(v => !isNaN(v)), 1);
    const dataLength = timeView === 'daily' ? dailyData.length : 12;
    
    const barWidth = timeView === 'daily' 
      ? Math.max(8, Math.min(16, (width - 100) / Math.min(dataLength, 31)))
      : Math.max(12, Math.min(22, (width - 100) / 12));
    
    const handleToggleValues = () => {
      setShowAllValues(!showAllValues);
      setHoveredIndex(null);
    };

    const handleBarPress = (index) => {
      if (hoveredIndex === index) {
        setHoveredIndex(null);
      } else {
        setHoveredIndex(index);
      }
    };

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

        <TouchableOpacity 
          style={styles.toggleValuesButton}
          onPress={handleToggleValues}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showAllValues ? "eye-off-outline" : "eye-outline"} 
            size={16} 
            color="#02569B" 
          />
          <Text style={styles.toggleValuesText}>
            {showAllValues ? 'Hide Values' : 'Show Values'}
          </Text>
        </TouchableOpacity>

        <View style={styles.graphBody}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{(maxValue * 1.2).toFixed(0)}</Text>
            <Text style={styles.axisLabel}>0</Text>
          </View>
          
          <View style={styles.chartSpace}>
            {timeView === 'daily' ? (
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollableGraph}
              >
                <View style={styles.pointsRow}>
                  {values.map((v, i) => {
                    const value = Number(v) || 0;
                    const bottomPos = value > 0 ? (value / (maxValue * 1.2)) * 80 : 0;
                    const isSelected = hoveredIndex === i;
                    
                    return (
                      <TouchableOpacity 
                        key={i}
                        style={[styles.dotContainer, { width: barWidth + 8 }]}
                        onPress={() => handleBarPress(i)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.connectingLine, { 
                          height: `${bottomPos}%`,
                          backgroundColor: isSelected ? 
                            (isAmount ? '#1E88E5' : '#02569B') : 
                            'rgba(2, 86, 155, 0.3)'
                        }]} />
                        
                        <View style={[
                          styles.dot, { 
                            bottom: `${bottomPos}%`,
                            backgroundColor: isAmount ? '#1E88E5' : '#02569B',
                            transform: [{ scale: isSelected ? 1.5 : 1 }]
                          }
                        ]} />
                        
                        {(showAllValues || isSelected) && value > 0 && (
                          <View
                            style={[
                              styles.valueLabel,
                              {
                                position: 'absolute',
                                bottom: i % 2 === 0 ? 118 : 98,
                                left: '50%',
                                transform: [{ translateX: -12 }],
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                paddingHorizontal: 4,
                                paddingVertical: 2,
                                minWidth: 26,
                                borderRadius: 4,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: '600',
                                color: '#FFFFFF',
                                textAlign: 'center',
                                letterSpacing: 0.2,
                              }}
                            >
                              {value.toFixed(0)}
                            </Text>
                          </View>
                        )}
                        
                        <Text style={[styles.dayLabel, { 
                          bottom: -20,
                          fontSize: dataLength > 20 ? 9 : 10,
                          color: isSelected ? colors.primary : colors.gray400
                        }]}>
                          {i + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollableGraph}
              >
                <View style={styles.barGraphContainer}>
                  {values.map((v, i) => {
                    const value = Number(v) || 0;
                    const barHeight = value > 0 ? (value / (maxValue * 1.2)) * 80 : 0;
                    const isSelected = hoveredIndex === i;
                    
                    return (
                      <TouchableOpacity 
                        key={i}
                        style={[styles.barCol, { width: barWidth + 10 }]}
                        onPress={() => handleBarPress(i)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.bar, 
                          { 
                            height: `${barHeight}%`,
                            width: barWidth,
                            backgroundColor: isAmount ? '#1E88E5' : '#02569B',
                            opacity: isSelected ? 1 : 0.8
                          }
                        ]} />
                        
                        {(showAllValues || isSelected) && value > 0 && (
                          <View style={[styles.barValueLabel, { 
                            bottom: `${Math.min(barHeight + 8, 85)}%`,
                            left: '50%',
                            transform: [{ translateX: -20 }],
                            backgroundColor: isSelected ? 
                              (isAmount ? '#1E88E5' : '#02569B') : 
                              'rgba(255, 255, 255, 0.95)'
                          }]}>
                            <Text style={[
                              styles.barValueText,
                              { color: isSelected ? '#FFFFFF' : colors.primary }
                            ]}>
                              {value.toFixed(isAmount ? 0 : 1)}
                            </Text>
                          </View>
                        )}
                        
                        <Text style={[styles.monthLabel, { 
                          marginTop: 4,
                          fontSize: 10,
                          textAlign: 'center',
                          width: barWidth + 10,
                          color: isSelected ? colors.primary : colors.gray400
                        }]}>
                          {currentData.labels[i]?.slice(0,3) || months[i]?.slice(0,3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

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
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={() => setShowReportTypeModal(true)}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? (
              <ActivityIndicator size="small" color="#02569B" />
            ) : (
              <Ionicons name="document-text" size={16} color="#02569B" />
            )}
            <Text style={styles.downloadText}>
              {isGeneratingReport ? 'Generating...' : 'Download Report'}
            </Text>
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
        <GraphCard title="Units (kWh)" unit="kWh" />
        <View style={styles.spacer} />
      </ScrollView>

      {/* Report Type Selection Modal */}
      <Modal visible={showReportTypeModal} transparent animationType="fade">
        <View style={styles.reportTypeModal}>
          <View style={styles.reportTypeContent}>
            <Text style={styles.reportTypeTitle}>Select Report Type</Text>
            

            
            <TouchableOpacity 
              style={styles.reportTypeOption}
              onPress={() => {
                setShowReportTypeModal(false);
                exportDetailedPDF();
              }}
            >
              <Ionicons name="document-attach" size={20} color="#02569B" />
              <View style={styles.reportTypeTextContainer}>
                <Text style={styles.reportTypeName}>Detailed Monthly Report</Text>
                <Text style={styles.reportTypeDesc}>Official meter report with all details</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelReportBtn}
              onPress={() => setShowReportTypeModal(false)}
            >
              <Text style={styles.cancelReportText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    minWidth: 120,
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

  // Toggle Values Button
  toggleValuesButton: {
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
    alignSelf: 'flex-end',
  },
  toggleValuesText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },

  // Graph Components
  graphBody: {
    height: 200,
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
    overflow: 'hidden',
  },
  axisLabel: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },

  // Scrollable graph content
  scrollableGraph: {
    paddingRight: spacing.md,
    minWidth: '100%',
  },

  // Day Label
  dayLabel: {
    position: 'absolute',
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Month Label
  monthLabel: {
    ...typography.tiny,
    fontWeight: '500',
  },

  // Line Graph
  pointsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: 25,
    minWidth: '100%',
  },
  dotContainer: {
    height: '100%',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 2,
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

  // Value Labels
  valueLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 20,
    minWidth: 40,
    alignItems: 'center',
    ...shadows.sm,
  },
  valueLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Bar Graph Value Labels
  barValueLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 20,
    minWidth: 40,
    alignItems: 'center',
    ...shadows.sm,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Bar Graph
  barGraphContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
    paddingBottom: 25,
    minWidth: '100%',
  },
  barCol: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    marginHorizontal: 2,
  },
  bar: {
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    minHeight: 2,
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

  // Report Type Modal
  reportTypeModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportTypeContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...shadows.lg,
  },
  reportTypeTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  reportTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  reportTypeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reportTypeName: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 4,
  },
  reportTypeDesc: {
    ...typography.small,
    color: colors.gray500,
  },
  cancelReportBtn: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelReportText: {
    ...typography.body,
    color: colors.gray600,
    fontWeight: '600',
  },

  // Filter Modal
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