import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function ReportScreen() {
  const [timeView, setTimeView] = useState('daily');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('December');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedDate, setSelectedDate] = useState('01');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = ['2023', '2024', '2025', '2026'];
  const dates = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));

  // ========== DATA FUNCTIONS ==========
  const getDailyUnitData = () => ({
    title: 'Unit Consumption',
    period: `${selectedDate} ${selectedMonth} ${selectedYear}`,
    currentValue: '18',
    previousValue: '0',
    labels: ['01', '03', '05', '07', '08'],
    values: [15, 17, 14, 16, 18],
    avg: '15.13',
    max: '17.00',
    unit: 'kWh',
    chartHeight: 120,
    yAxisValues: [0, 5, 10, 15, 20],
    color: '#4CAF50',
  });

  const getDailyAmountData = () => ({
    title: 'Amount Consumption',
    period: `${selectedDate} ${selectedMonth} ${selectedYear}`,
    currentValue: '107',
    previousValue: '100',
    labels: ['01', '03', '05', '07', '08'],
    values: [95, 107, 90, 98, 101],
    avg: '90.45',
    max: '101.66',
    unit: '₹',
    chartHeight: 120,
    yAxisValues: [0, 25, 50, 75, 100, 125],
    color: '#2196F3',
  });

  const getMonthlyUnitData = () => ({
    title: 'Unit Consumption',
    period: `${selectedMonth} ${selectedYear}`,
    currentValue: '2K',
    previousValue: '0',
    labels: months,
    values: [450, 500, 800, 650, 1200, 1000, 1800, 1600, 1400, 1100, 900, 700],
    avg: '455.17',
    max: '763.00',
    unit: 'kWh',
    chartHeight: 120,
    yAxisValues: [0, 500, 1000, 1500, 2000],
    color: '#4CAF50',
  });

  const getMonthlyAmountData = () => ({
    title: 'Amount Consumption',
    period: `${selectedMonth} ${selectedYear}`,
    currentValue: '8K',
    previousValue: '0',
    labels: months,
    values: [1800, 2000, 3200, 2600, 4800, 4000, 7200, 6400, 5600, 4400, 3600, 2800],
    avg: '2833.01',
    max: '4871.80',
    unit: '₹',
    chartHeight: 120,
    yAxisValues: [0, 2000, 4000, 6000, 8000],
    color: '#2196F3',
  });

  useEffect(() => {
    updateChartData();
  }, [timeView, selectedMonth, selectedYear, selectedDate]);

  const updateChartData = () => {
    setChartData({
      dailyUnit: getDailyUnitData(),
      dailyAmount: getDailyAmountData(),
      monthlyUnit: getMonthlyUnitData(),
      monthlyAmount: getMonthlyAmountData(),
    });
  };

  const applyFilter = () => {
    setLoading(true);
    setTimeout(() => {
      updateChartData();
      setShowFilterModal(false);
      setLoading(false);
      Alert.alert('Success', `Filter applied! Showing ${timeView} view for ${timeView === 'daily' ? `${selectedDate} ${selectedMonth} ${selectedYear}` : `${selectedMonth} ${selectedYear}`}`);
    }, 500);
  };

  // ========== SIMPLIFIED LINE GRAPH ==========
  const renderDailyLineGraph = (data) => {
    if (!data) return null;
    
    const maxY = Math.max(...data.yAxisValues);
    const chartWidth = width - 60;
    const chartHeight = data.chartHeight;
    const pointRadius = 4;
    
    // Calculate points
    const points = data.values.map((value, index) => {
      const x = (index * (chartWidth / (data.labels.length - 1))) || 10;
      const y = Math.max(pointRadius, Math.min(chartHeight - 30, 
        chartHeight - 25 - ((value / maxY) * (chartHeight - 40))));
      return { x, y, value };
    });

    return (
      <View style={styles.chartContainer}>
        {/* Y Axis Labels - Smaller */}
        <View style={styles.yAxis}>
          {data.yAxisValues.slice(1, -1).map((value, index) => (
            <Text key={index} style={styles.yAxisText}>
              {value}
            </Text>
          ))}
        </View>
        
        {/* Main Chart Area */}
        <View style={[styles.chartArea, { 
          width: chartWidth, 
          height: chartHeight,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          padding: 5,
        }]}>
          
          {/* Grid Lines */}
          {data.yAxisValues.slice(1, -1).map((value, index) => {
            const yPos = chartHeight - 25 - ((value / maxY) * (chartHeight - 40));
            return (
              <View 
                key={`grid-${index}`}
                style={[styles.gridLine, { top: yPos }]}
              />
            );
          })}
          
          {/* Line Path */}
          <View style={[styles.lineContainer, { 
            width: chartWidth - 10, 
            height: chartHeight - 30,
            paddingHorizontal: 5,
          }]}>
            {points.slice(0, -1).map((point, index) => {
              const nextPoint = points[index + 1];
              const dx = nextPoint.x - point.x;
              const dy = nextPoint.y - point.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              
              return (
                <View
                  key={`line-${index}`}
                  style={{
                    position: 'absolute',
                    left: point.x,
                    top: point.y,
                    width: length,
                    height: 2,
                    backgroundColor: data.color,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: '0 0',
                    zIndex: 1,
                  }}
                />
              );
            })}
            
            {/* Data Points */}
            {points.map((point, index) => (
              <View 
                key={`point-${index}`} 
                style={[styles.graphPoint, {
                  left: point.x - pointRadius,
                  top: point.y - pointRadius,
                  backgroundColor: data.color,
                  width: pointRadius * 2,
                  height: pointRadius * 2,
                  zIndex: 2,
                }]} 
              />
            ))}
          </View>
          
          {/* X Axis Labels - Smaller */}
          <View style={[styles.xAxis, { 
            width: chartWidth - 10,
            bottom: 2,
            paddingHorizontal: 5,
          }]}>
            {data.labels.map((label, index) => {
              const xPos = (index * ((chartWidth - 20) / (data.labels.length - 1)));
              return (
                <Text 
                  key={index} 
                  style={[styles.xAxisText, { 
                    left: Math.max(0, xPos - 6),
                    fontSize: 9,
                  }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // ========== SIMPLIFIED BAR CHART ==========
  const renderMonthlyBarChart = (data) => {
    if (!data) return null;
    
    const maxY = Math.max(...data.yAxisValues);
    const chartWidth = width - 60;
    const chartHeight = data.chartHeight;
    const barWidth = (chartWidth / data.labels.length) - 4;

    return (
      <View style={styles.chartContainer}>
        {/* Y Axis Labels - Smaller */}
        <View style={styles.yAxis}>
          {data.yAxisValues.slice(1, -1).map((value, index) => (
            <Text key={index} style={styles.yAxisText}>
              {value >= 1000 ? `${(value/1000)}k` : value}
            </Text>
          ))}
        </View>
        
        {/* Main Chart Area */}
        <View style={[styles.chartArea, { 
          width: chartWidth, 
          height: chartHeight,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          padding: 5,
        }]}>
          
          {/* Grid Lines */}
          {data.yAxisValues.slice(1, -1).map((value, index) => {
            const yPos = chartHeight - 25 - ((value / maxY) * (chartHeight - 40));
            return (
              <View 
                key={`grid-${index}`}
                style={[styles.gridLine, { top: yPos }]}
              />
            );
          })}
          
          {/* Bars */}
          <View style={[styles.barsContainer, { 
            width: chartWidth - 10, 
            height: chartHeight - 30,
            paddingHorizontal: 5,
          }]}>
            {data.values.map((value, index) => {
              const barHeight = Math.min(chartHeight - 50, (value / maxY) * (chartHeight - 40));
              const xPos = index * ((chartWidth - 10) / data.labels.length) + 2;
              
              return (
                <View key={index} style={[styles.barColumn, { left: xPos }]}>
                  <View style={[styles.bar, { 
                    height: barHeight,
                    backgroundColor: data.color,
                    width: barWidth,
                    borderRadius: 2,
                  }]} />
                  
                  {/* Month Label - Smaller */}
                  <Text style={[styles.barLabel, { 
                    bottom: 0,
                    fontSize: 9,
                    width: barWidth + 4,
                    textAlign: 'center',
                  }]}>
                    {data.labels[index]}
                  </Text>
                </View>
              );
            })}
          </View>
          
          {/* X Axis Labels - Already handled by bar labels */}
        </View>
      </View>
    );
  };

  // ========== DOWNLOAD PDF ==========
  const downloadPDF = async () => {
    try {
      setLoading(true);
      const unitData = timeView === 'daily' ? chartData.dailyUnit : chartData.monthlyUnit;
      const amountData = timeView === 'daily' ? chartData.dailyAmount : chartData.monthlyAmount;
      
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
              .section { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #4CAF50; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Energy Consumption Report</h1>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="info">
              <h3>Consumer Information</h3>
              <p><strong>Meter ID:</strong> B-0001</p>
              <p><strong>Name:</strong> Sanjay Gupta</p>
              <p><strong>Period:</strong> ${unitData.period}</p>
              <p><strong>Report Type:</strong> ${timeView === 'daily' ? 'Daily' : 'Monthly'}</p>
            </div>
            
            <div class="section">
              <h2>Unit Consumption (${unitData.unit})</h2>
              <p><strong>Current:</strong> ${unitData.currentValue}</p>
              <p><strong>Average:</strong> ${unitData.avg}</p>
              <p><strong>Maximum:</strong> ${unitData.max}</p>
              
              <table>
                <tr>
                  <th>${timeView === 'daily' ? 'Date' : 'Month'}</th>
                  <th>Value</th>
                </tr>
                ${unitData.labels.map((label, i) => `
                  <tr>
                    <td>${label}</td>
                    <td>${unitData.values[i]}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            
            <div class="section">
              <h2>Amount Consumption (${amountData.unit})</h2>
              <p><strong>Current:</strong> ${amountData.currentValue}</p>
              <p><strong>Average:</strong> ${amountData.avg}</p>
              <p><strong>Maximum:</strong> ${amountData.max}</p>
              
              <table>
                <tr>
                  <th>${timeView === 'daily' ? 'Date' : 'Month'}</th>
                  <th>Value</th>
                </tr>
                ${amountData.labels.map((label, i) => `
                  <tr>
                    <td>${label}</td>
                    <td>${amountData.values[i]}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            
            <div style="margin-top: 40px; text-align: center; color: #666;">
              <p>This is an official report generated by Energy Management System</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Energy Report',
        UTI: 'com.adobe.pdf',
      });

      setLoading(false);
      Alert.alert('Success', 'PDF downloaded successfully!');

    } catch (error) {
      console.error('PDF Error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  // ========== DOWNLOAD EXCEL ==========
  const downloadExcel = async () => {
    try {
      setLoading(true);
      const unitData = timeView === 'daily' ? chartData.dailyUnit : chartData.monthlyUnit;
      const amountData = timeView === 'daily' ? chartData.dailyAmount : chartData.monthlyAmount;
      
      const csvContent = `Energy Consumption Report
Generated: ${new Date().toLocaleDateString()}
Meter ID: B-0001
Consumer: Sanjay Gupta
Period: ${unitData.period}
Report Type: ${timeView === 'daily' ? 'Daily' : 'Monthly'}

${timeView === 'daily' ? 'Date' : 'Month'},Unit Consumption (${unitData.unit}),Amount Consumption (${amountData.unit})
${unitData.labels.map((label, i) => 
  `${label},${unitData.values[i]},${amountData.values[i]}`
).join('\n')}

Summary:
Average Unit,${unitData.avg}
Maximum Unit,${unitData.max}
Current Unit,${unitData.currentValue}
Average Amount,${amountData.avg}
Maximum Amount,${amountData.max}
Current Amount,${amountData.currentValue}`;

      if (Platform.OS === 'web') {
        // For web
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Energy_Data_${timeView}_${selectedDate}_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For mobile
        const fileUri = FileSystem.documentDirectory + `Energy_Data_${timeView}_${selectedDate}_${selectedMonth}_${selectedYear}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        await Sharing.shareAsync(fileUri);
      }

      setLoading(false);
      Alert.alert('Success', 'Excel file downloaded successfully!');

    } catch (error) {
      console.error('Excel Error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to download Excel');
    }
  };

  if (!chartData || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.meterId}>B-0001</Text>
          <Text style={styles.consumerName}>Sanjay Gupta</Text>
        </View>
      </View>

      {/* Compact Controls */}
      <View style={styles.controlsRow}>
        {/* Time View Toggle - Small */}
        <View style={styles.timeViewContainer}>
          <TouchableOpacity 
            style={[styles.timeViewButton, timeView === 'daily' && styles.activeTimeView]}
            onPress={() => setTimeView('daily')}
          >
            <Text style={[styles.timeViewText, timeView === 'daily' && styles.activeTimeViewText]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeViewButton, timeView === 'monthly' && styles.activeTimeView]}
            onPress={() => setTimeView('monthly')}
          >
            <Text style={[styles.timeViewText, timeView === 'monthly' && styles.activeTimeViewText]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Button - Small */}
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Current Period Display - Small */}
      <View style={styles.periodDisplay}>
        <Text style={styles.periodText}>
          {timeView === 'daily' 
            ? `${selectedDate} ${selectedMonth} ${selectedYear}`
            : `${selectedMonth} ${selectedYear}`
          }
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Unit Consumption - Compact */}
        <View style={styles.graphSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unit Consumption</Text>
            <Text style={styles.sectionSubtitle}>{chartData.dailyUnit.unit}</Text>
          </View>
          
          <View style={styles.valueDisplay}>
            <Text style={[styles.currentValue, { color: '#4CAF50' }]}>
              {timeView === 'daily' ? chartData.dailyUnit.currentValue : chartData.monthlyUnit.currentValue}
            </Text>
          </View>

          {/* Chart */}
          <View style={styles.chartWrapper}>
            {timeView === 'daily' 
              ? renderDailyLineGraph(chartData.dailyUnit)
              : renderMonthlyBarChart(chartData.monthlyUnit)
            }
          </View>

          {/* Stats - Compact */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {timeView === 'daily' ? chartData.dailyUnit.avg : chartData.monthlyUnit.avg}
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Maximum</Text>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>
                {timeView === 'daily' ? chartData.dailyUnit.max : chartData.monthlyUnit.max}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount Consumption - Compact */}
        <View style={styles.graphSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Amount Consumption</Text>
            <Text style={styles.sectionSubtitle}>{chartData.dailyAmount.unit}</Text>
          </View>
          
          <View style={styles.valueDisplay}>
            <Text style={[styles.currentValue, { color: '#2196F3' }]}>
              {timeView === 'daily' ? chartData.dailyAmount.currentValue : chartData.monthlyAmount.currentValue}
            </Text>
          </View>

          {/* Chart */}
          <View style={styles.chartWrapper}>
            {timeView === 'daily' 
              ? renderDailyLineGraph(chartData.dailyAmount)
              : renderMonthlyBarChart(chartData.monthlyAmount)
            }
          </View>

          {/* Stats - Compact */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {timeView === 'daily' ? chartData.dailyAmount.avg : chartData.monthlyAmount.avg}
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Maximum</Text>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>
                {timeView === 'daily' ? chartData.dailyAmount.max : chartData.monthlyAmount.max}
              </Text>
            </View>
          </View>
        </View>

        {/* Download Buttons - Compact */}
        <View style={styles.downloadContainer}>
          <Text style={styles.downloadTitle}>Download Reports</Text>
          <View style={styles.downloadButtons}>
            <TouchableOpacity style={styles.pdfButton} onPress={downloadPDF}>
              <Text style={styles.downloadButtonText}>📄 PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.excelButton} onPress={downloadExcel}>
              <Text style={styles.downloadButtonText}>📊 Excel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

     

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Filter</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* View Type */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>View Type</Text>
                <View style={styles.viewTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.viewTypeButton,
                      timeView === 'daily' && styles.activeViewTypeButton
                    ]}
                    onPress={() => setTimeView('daily')}
                  >
                    <Text style={[
                      styles.viewTypeText,
                      timeView === 'daily' && styles.activeViewTypeText
                    ]}>
                      Daily
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewTypeButton,
                      timeView === 'monthly' && styles.activeViewTypeButton
                    ]}
                    onPress={() => setTimeView('monthly')}
                  >
                    <Text style={[
                      styles.viewTypeText,
                      timeView === 'monthly' && styles.activeViewTypeText
                    ]}>
                      Monthly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Year Selection - Always shown */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Year</Text>
                <View style={styles.yearGrid}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearButton,
                        selectedYear === year && styles.selectedYearButton
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.yearButtonText,
                        selectedYear === year && styles.selectedYearButtonText
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Month Selection - Always shown */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Month</Text>
                <View style={styles.monthGrid}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthButton,
                        selectedMonth === month && styles.selectedMonthButton
                      ]}
                      onPress={() => setSelectedMonth(month)}
                    >
                      <Text style={[
                        styles.monthButtonText,
                        selectedMonth === month && styles.selectedMonthButtonText
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Selection - Only for Daily */}
              {timeView === 'daily' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Date</Text>
                  <View style={styles.dateGrid}>
                    {dates.slice(0, 15).map((date) => (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.dateButton,
                          selectedDate === date && styles.selectedDateButton
                        ]}
                        onPress={() => setSelectedDate(date)}
                      >
                        <Text style={[
                          styles.dateButtonText,
                          selectedDate === date && styles.selectedDateButtonText
                        ]}>
                          {date}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.dateGrid}>
                    {dates.slice(15, 31).map((date) => (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.dateButton,
                          selectedDate === date && styles.selectedDateButton
                        ]}
                        onPress={() => setSelectedDate(date)}
                      >
                        <Text style={[
                          styles.dateButtonText,
                          selectedDate === date && styles.selectedDateButtonText
                        ]}>
                          {date}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilter}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  // Header - Compact
  header: {
    backgroundColor: '#1E88E5',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  meterId: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  consumerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Controls - Compact
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  timeViewContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeViewButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 17,
  },
  activeTimeView: {
    backgroundColor: '#1E88E5',
  },
  timeViewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTimeViewText: {
    color: '#FFFFFF',
  },
  filterButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 17,
    elevation: 2,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Period Display
  periodDisplay: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '00',
    color: '#333',
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  // Graph Section - Compact
  graphSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 15,
    
  },
  currentValue: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 15,
    marginLeft: -20,
  },
  // Chart Styles - Compact
  chartContainer: {
    flexDirection: 'row',
    height: 130,
    width: '100%',
  },
  yAxis: {
    width: 25,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
    paddingBottom: 25,
  },
  yAxisText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
  },
  chartArea: {
    position: 'relative',
    marginLeft: 5,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  lineContainer: {
    position: 'absolute',
    top: 5,
    left: 0,
  },
  graphPoint: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  xAxis: {
    position: 'absolute',
    flexDirection: 'row',
  },
  xAxisText: {
    position: 'absolute',
    color: '#666',
    fontWeight: '500',
    minWidth: 15,
    textAlign: 'center',
  },
  barsContainer: {
    position: 'absolute',
    top: 5,
    left: 0,
  },
  barColumn: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 0,
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  barLabel: {
    position: 'absolute',
    color: '#666',
    fontWeight: '500',
  },
  // Stats - Compact
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  // Download Section - Compact
  downloadContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  downloadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  excelButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Bottom Navigation - Compact
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 5,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    color: '#9E9E9E',
  },
  navText: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  activeNavIcon: {
    color: '#1E88E5',
  },
  activeNavText: {
    color: '#1E88E5',
    fontWeight: '700',
  },
  // Modal Styles - Compact
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    paddingHorizontal: 15,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  viewTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 3,
  },
  viewTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeViewTypeButton: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  viewTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeViewTypeText: {
    color: '#1E88E5',
    fontWeight: '700',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearButton: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedYearButton: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedYearButtonText: {
    color: '#FFFFFF',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthButton: {
    flex: 1,
    minWidth: '22%',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedMonthButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  selectedMonthButtonText: {
    color: '#FFFFFF',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  dateButton: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDateButton: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  dateButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  selectedDateButtonText: {
    color: '#FFFFFF',
  },
  modalFooter: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  applyButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});