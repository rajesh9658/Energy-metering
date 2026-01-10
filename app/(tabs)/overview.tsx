import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Swiper from "react-native-swiper";
import axios from "axios";
import { getSiteDataUrl } from "../config";

const { width: screenWidth } = Dimensions.get('window');

export default function OverviewScreen({ route }) {
  // Get site name from route params or use default
  const siteName = route?.params?.siteName || "neelkanth-1";
   
  // STATE FOR API DATA
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // SWIPER DATA - NOW FULLY DYNAMIC
  const [slides, setSlides] = useState([
    {
      key: "overview",
      title: "Overview",
      icon: "📊",
      rows: [
        { label: "Grid Balance", value: "Loading...", color: "#2e7d32" },
        { label: "Grid Unit (Live)", value: "Loading... kWh" },
        { label: "DG Unit", value: "Loading... kWh" },
        { label: "Connection Status", value: "Loading...", color: "#2e7d32", badge: true },
        { label: "Supply Status", value: "Loading..." },
        { label: "Last Updated On", value: "Loading...", color: "#0b63a8" },
      ],
      consumptionData: {
        grid: 0.0,
        dg: 0.0,
        total: 0.0,
        gridPercent: "0.00%",
        dgPercent: "0.00%",
      },
    },
    {
      key: "today",
      title: "Today's Consumption",
      icon: "📅",
      rows: [
        { label: "EB (Grid)", value: "Loading...", unit: "₹" },
        { label: "EB (FIXED CHARGE)", value: "Loading...", unit: "₹" },
        { label: "Last Updated", value: "Loading...", color: "#0b63a8" },
      ],
      consumptionData: {
        grid: 0.0,
        dg: 0.0,
        total: 0.0,
        gridPercent: "0.00%",
        dgPercent: "0.00%",
      },
    },
    {
      key: "monthly",
      title: "Monthly Consumption",
      icon: "📈",
      rows: [
        { label: "EB (Grid)", value: "Loading...", unit: "₹" },
        { label: "EB (FIXED CHARGE)", value: "Loading...", unit: "₹" },
        { label: "Last Updated", value: "Loading...", color: "#0b63a8" },
      ],
      consumptionData: {
        grid: 0.0,
        dg: 0.0,
        total: 0.0,
        gridPercent: "0.00%",
        dgPercent: "0.00%",
      },
    },
  ]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const swiperRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const userInteractionTimerRef = useRef(null);
  
  const active = slides[activeIndex];
  
  // AUTO-SLIDE CONFIGURATION
  const AUTO_SLIDE_INTERVAL = 5000;
  const RESUME_DELAY = 8000;

  // STATIC DATA - Updated with grid_kw from API
  const [staticData, setStaticData] = useState({
    sanctionedLoad: {
      gridValue: "Loading... kW",
      dgValue: "Loading... kW",
    },
    voltageCurrent: {
      voltageR: "Loading... V",
      voltageY: "Loading... V",
      voltageB: "Loading... V",
      currentR: "Loading... A",
      currentY: "Loading... A",
      currentB: "Loading... A",
    }
  });

  // FETCH SITE DATA
  useEffect(() => {
    fetchSiteData();
  }, [siteName]);

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      // Use dynamic site name
      const response = await axios.get(getSiteDataUrl(siteName));
      console.log('API Response for', siteName, ':', response.data);
      
      if (response.data && response.data.success) {
        setSiteData(response.data);
        
        // Update all slides with API data
        updateAllSlides(response.data);
        
        // Update sanctioned load
        updateSanctionedLoad(response.data.asset_information);
        
        // Update voltage and current data
        updateVoltageCurrentData(response.data.asset_information.electric_parameters);
      } else {
        setError("Invalid API response");
      }
    } catch (err) {
      console.error("Error fetching site data:", err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchSiteData();
  };

  const updateAllSlides = (data) => {
    const assetInfo = data.asset_information;
    const electricParams = assetInfo.electric_parameters || {};
    const siteValues = assetInfo.site_values || {};
    
    const newSlides = [...slides];
    
    // Update Overview slide with API data
    const connectionStatus = siteValues.relay_status !== undefined 
      ? (siteValues.relay_status ? "CONNECTED" : "DISCONNECTED")
      : "UNKNOWN";
    
    const supplyStatus = siteValues.force_off !== undefined
      ? (siteValues.force_off ? "FORCE OFF" : "NORMAL")
      : "UNKNOWN";
    
    newSlides[0].rows = [
      { 
        label: "Grid Balance", 
        value: `Rs. ${electricParams.balance || "0"}`, 
        color: (electricParams.balance || 0) > 50 ? "#2e7d32" : "#ef4444" 
      },
      { 
        label: "Grid Unit (Live)", 
        value: electricParams.unit ? `${electricParams.unit.toFixed(2)} kWh` : "0.00 kWh" 
      },
      { 
        label: "DG Unit", 
        value: "0.00 kWh" // API me nahi hai, static rakh rahe hain
      },
      { 
        label: "Connection Status", 
        value: connectionStatus, 
        color: connectionStatus === "CONNECTED" ? "#2e7d32" : "#ef4444", 
        badge: true 
      },
      { 
        label: "Supply Status", 
        value: supplyStatus 
      },
      { 
        label: "Last Updated On", 
        value: new Date().toLocaleTimeString(), 
        color: "#0b63a8" 
      },
    ];

    // Calculate consumption data based on electric parameters
    const gridPower = electricParams.active_power_kw || 0;
    const dgPower = assetInfo.dg_kw || 0;
    const totalPower = gridPower + dgPower;
    
    // For Today's Consumption - Use m_unit_charge and m_fixed_charge
    const todayGridCharge = assetInfo.m_unit_charge || 0;
    const todayFixedCharge = assetInfo.m_fixed_charge || 0;
    
    newSlides[1].rows = [
      { 
        label: "EB (Grid)", 
        value: todayGridCharge.toFixed(2), 
        unit: "₹" 
      },
      { 
        label: "EB (FIXED CHARGE)", 
        value: todayFixedCharge.toFixed(2), 
        unit: "₹" 
      },
      { 
        label: "Last Updated", 
        value: new Date().toLocaleTimeString(), 
        color: "#0b63a8" 
      },
    ];
    
    // Update Today's consumption data
    newSlides[1].consumptionData = {
      grid: gridPower,
      dg: dgPower,
      total: totalPower,
      gridPercent: totalPower > 0 ? ((gridPower / totalPower) * 100).toFixed(2) + "%" : "0.00%",
      dgPercent: totalPower > 0 ? ((dgPower / totalPower) * 100).toFixed(2) + "%" : "0.00%",
    };

    // For Monthly Consumption - Use estimated values or API data if available
    // Since API doesn't provide monthly data, we'll use daily values multiplied
    const daysInMonth = 30; // Assuming 30 days
    const monthlyGridCharge = (todayGridCharge * daysInMonth).toFixed(2);
    const monthlyFixedCharge = (todayFixedCharge * daysInMonth).toFixed(2);
    
    newSlides[2].rows = [
      { 
        label: "EB (Grid)", 
        value: monthlyGridCharge, 
        unit: "₹" 
      },
      { 
        label: "EB (FIXED CHARGE)", 
        value: monthlyFixedCharge, 
        unit: "₹" 
      },
      { 
        label: "Last Updated", 
        value: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }), 
        color: "#0b63a8" 
      },
    ];
    
    // Update Monthly consumption data (multiply daily by 30)
    newSlides[2].consumptionData = {
      grid: gridPower * daysInMonth,
      dg: dgPower * daysInMonth,
      total: totalPower * daysInMonth,
      gridPercent: totalPower > 0 ? ((gridPower / totalPower) * 100).toFixed(2) + "%" : "0.00%",
      dgPercent: totalPower > 0 ? ((dgPower / totalPower) * 100).toFixed(2) + "%" : "0.00%",
    };

    // Update Overview consumption data
    newSlides[0].consumptionData = newSlides[1].consumptionData;

    setSlides(newSlides);
  };

  const updateSanctionedLoad = (assetInfo) => {
    setStaticData(prev => ({
      ...prev,
      sanctionedLoad: {
        gridValue: `${assetInfo.grid_kw || 0} kW`,
        dgValue: `${assetInfo.dg_kw || 0} kW`,
      },
    }));
  };

  const updateVoltageCurrentData = (electricParams) => {
    if (!electricParams) return;
    
    setStaticData(prev => ({
      ...prev,
      voltageCurrent: {
        voltageR: electricParams.voltage_l_l?.r ? `${electricParams.voltage_l_l.r.toFixed(1)} V` : "0.0 V",
        voltageY: electricParams.voltage_l_l?.y ? `${electricParams.voltage_l_l.y.toFixed(1)} V` : "0.0 V",
        voltageB: electricParams.voltage_l_l?.b ? `${electricParams.voltage_l_l.b.toFixed(1)} V` : "0.0 V",
        currentR: electricParams.current?.r ? `${electricParams.current.r.toFixed(3)} A` : "0.000 A",
        currentY: electricParams.current?.y ? `${electricParams.current.y.toFixed(3)} A` : "0.000 A",
        currentB: electricParams.current?.b ? `${electricParams.current.b.toFixed(3)} A` : "0.000 A",
      },
    }));
  };

  // MANUAL NAVIGATION FUNCTIONS
  const goToNextSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.scrollBy(1);
      handleUserInteraction();
    }
  };

  const goToPrevSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.scrollBy(-1);
      handleUserInteraction();
    }
  };

  // HANDLE USER INTERACTION
  const handleUserInteraction = () => {
    setIsAutoPlaying(false);
    
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
    
    userInteractionTimerRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, RESUME_DELAY);
  };

  // AUTO-SLIDE LOGIC
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimerRef.current = setInterval(() => {
        if (swiperRef.current) {
          swiperRef.current.scrollBy(1);
        }
      }, AUTO_SLIDE_INTERVAL);
    } else {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      if (userInteractionTimerRef.current) {
        clearTimeout(userInteractionTimerRef.current);
      }
    };
  }, [isAutoPlaying]);

  // HANDLE SWIPER INDEX CHANGE
  const handleIndexChanged = (index) => {
    setActiveIndex(index);
  };

  // TOGGLE AUTO-PLAY
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // LOADING STATE
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b63a8" />
          <Text style={styles.loadingText}>Loading {siteName} data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading data</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchSiteData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0b63a8"]}
            tintColor="#0b63a8"
          />
        }
      >
        {/* HEADER SECTION - Display site name from API */}
        <View style={styles.header}>
         
        </View>

        {/* SWIPER SECTION */}
        <View style={styles.swiperWrapper}>
          <Swiper
            ref={swiperRef}
            height={340}
            loop={true}
            autoplay={false}
            showsPagination={true}
            dotStyle={styles.dot}
            activeDotStyle={styles.activeDot}
            onIndexChanged={handleIndexChanged}
            onTouchStart={handleUserInteraction}
            onTouchEnd={handleUserInteraction}
            onScrollBeginDrag={handleUserInteraction}
            paginationStyle={{ bottom: 10 }}
            scrollEnabled={true}
            bounces={true}
            removeClippedSubviews={false}
            loadMinimal={true}
            loadMinimalSize={1}
            autoplayTimeout={4}
            autoplayDirection={true}
            showsButtons={false}
            animationDuration={500}
            style={styles.swiperStyle}
          >
            {slides.map((item, index) => (
              <View key={item.key} style={styles.swiperCard}>
                {/* CARD HEADER */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>

                {/* CARD BODY */}
                <View style={styles.cardBody}>
                  {item.rows.map((row, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.dataRow,
                        i === item.rows.length - 1 && styles.lastRow
                      ]}
                    >
                      <Text style={styles.rowLabel}>
                        {row.label}
                      </Text>
                      
                      <View style={styles.valueContainer}>
                        {row.badge ? (
                          <View style={styles.badge}>
                            <View style={[
                              styles.statusDot, 
                              { 
                                backgroundColor: row.value === 'CONNECTED' ? '#2e7d32' : 
                                               row.value === 'DISCONNECTED' ? '#ef4444' : '#f39c12' 
                              }
                            ]} />
                            <Text style={[
                              styles.rowValue,
                              { color: row.color }
                            ]}>
                              {row.value}
                            </Text>
                          </View>
                        ) : (
                          <>
                            {row.unit && (
                              <Text style={styles.unitText}>{row.unit}</Text>
                            )}
                            <Text style={[
                              styles.rowValue,
                              { color: row.color },
                              row.bold && styles.boldValue
                            ]}>
                              {row.value}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Swiper>

          {/* AUTO-PLAY CONTROL AND NAVIGATION */}
          <View style={styles.controlContainer}>
            {/* Auto-Play Toggle */}
            <TouchableOpacity 
              style={styles.autoPlayButton}
              onPress={toggleAutoPlay}
              activeOpacity={0.7}
            >
              <View style={styles.autoPlayIndicator}>
                <View style={[
                  styles.autoPlayDot, 
                  isAutoPlaying ? styles.autoPlayActive : styles.autoPlayInactive
                ]} />
                <Text style={styles.autoPlayText}>
                  {isAutoPlaying ? 'Auto' : 'Paused'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Manual Navigation Buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={goToPrevSlide}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>
                  {activeIndex + 1} / {slides.length}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={goToNextSlide}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DYNAMIC CONSUMPTION TILE */}
        <View style={styles.tileContainer}>
          <View style={styles.tileHeader}>
            <View style={styles.tileIcon}>
              <Text style={{ color: "#fff", fontSize: 20 }}>📊</Text>
            </View>
            <Text style={styles.tileTitle}>
              {active.key === "overview" ? "Today's Consumption" : 
               active.key === "today" ? "Today's Consumption" : "Monthly Consumption"}
            </Text>
          </View>
          
          <View style={styles.consumptionBreakdown}>
            {/* Grid */}
            <View style={[styles.consumptionBox, styles.gridBox]}>
              <Text style={styles.consumptionLabel}>Grid</Text>
              <Text style={styles.consumptionValue}>
                {active.consumptionData.grid.toFixed(2)}
              </Text>
              <Text style={styles.consumptionUnit}>
                {active.key === "monthly" ? "kWh (est.)" : "kWh"}
              </Text>
              <View style={[styles.percentagePill, styles.gridPill]}>
                <Text style={styles.percentageText}>
                  {active.consumptionData.gridPercent}
                </Text>
              </View>
            </View>
            
            {/* DG */}
            <View style={[styles.consumptionBox, styles.dgBox]}>
              <Text style={styles.consumptionLabel}>DG</Text>
              <Text style={styles.consumptionValue}>
                {active.consumptionData.dg.toFixed(2)}
              </Text>
              <Text style={styles.consumptionUnit}>
                {active.key === "monthly" ? "kWh (est.)" : "kWh"}
              </Text>
              <View style={[styles.percentagePill, styles.dgPill]}>
                <Text style={styles.percentageText}>
                  {active.consumptionData.dgPercent}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Total Row */}
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {active.consumptionData.total.toFixed(2)}
                {active.key === "monthly" ? "*" : ""}
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Grid</Text>
              <Text style={styles.totalValue}>
                {active.consumptionData.grid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>DG</Text>
              <Text style={styles.totalValue}>
                {active.consumptionData.dg.toFixed(2)}
              </Text>
            </View>
          </View>
          
          {active.key === "monthly" && (
            <Text style={styles.noteText}>
              * Monthly values are estimated based on current consumption
            </Text>
          )}
        </View>

        {/* SANCTIONED LOAD TILE */}
        <View style={styles.tileContainer}>
          <View style={styles.tileHeader}>
            <View style={styles.tileIcon}>
              <Text style={{ color: "#fff", fontSize: 20 }}>⚡</Text>
            </View>
            <Text style={styles.tileTitle}>Sanctioned Load</Text>
          </View>
          
          <View style={styles.sanctionedCard}>
            <View style={styles.sanctionedRow}>
              <Text style={styles.sanctionedLabel}>EB (Grid)</Text>
              <Text style={styles.sanctionedValue}>
                {staticData.sanctionedLoad.gridValue}
              </Text>
            </View>

            <View style={styles.sanctionedDivider} />

            <View style={styles.sanctionedRow}>
              <Text style={styles.sanctionedLabel}>DG (Grid)</Text>
              <Text style={styles.sanctionedValue}>
                {staticData.sanctionedLoad.dgValue}
              </Text>
            </View>
          </View>
        </View>

        {/* THREE PHASE VOLTAGE & CURRENT TILE */}
        <View style={styles.tileContainer}>
          <View style={styles.tileHeader}>
            <View style={styles.tileIcon}>
              <Text style={{ color: "#fff", fontSize: 20 }}>🔌</Text>
            </View>
            <Text style={[styles.tileTitle, { flexShrink: 1 }]}>
              Three Phase Voltage & Current
            </Text>
          </View>
          
          {/* Voltage Section */}
          <View style={styles.phaseSection}>
            <Text style={styles.phaseSectionTitle}>Voltage (L-L)</Text>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase R-Y</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.voltageR}
              </Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase Y-B</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.voltageY}
              </Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase B-R</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.voltageB}
              </Text>
            </View>
          </View>
          
          {/* Current Section */}
          <View style={styles.phaseSection}>
            <Text style={styles.phaseSectionTitle}>Current</Text>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase R</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.currentR}
              </Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase Y</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.currentY}
              </Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase B</Text>
              <Text style={styles.phaseValue}>
                {staticData.voltageCurrent.currentB}
              </Text>
            </View>
          </View>
        </View>

        

        {/* BOTTOM GAP */}
        <View style={styles.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

// STYLES (same as previous code, just adding the RefreshControl related styles if needed)
const CARD_WIDTH = screenWidth - 48;
const CARD_MARGIN = 8;

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  container: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // LOADING STYLES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 16,
  },
  
  // ERROR STYLES
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0b63a8',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // HEADER
  header: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b63a8',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#0b63a8',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // SWIPER WRAPPER
  swiperWrapper: {
    height: 400,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  // SWIPER STYLE
  swiperStyle: {
    overflow: 'visible',
  },
  
  // SWIPER CARD
  swiperCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    shadowColor: "rgba(0, 0, 0, 0.35) 0px 5px 15px",
    shadowOffset: { 
      width: 0, 
      height: 8 
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 12,
    height: 340,
    borderWidth: 1,
    borderColor: "rgba(11, 99, 168, 0.1)",
    alignSelf: 'center',
  },

  dot: { 
    backgroundColor: "#cbd5e1", 
    width: 8, 
    height: 8, 
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: { 
    backgroundColor: "#0b63a8", 
    width: 24, 
    height: 8, 
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // CONTROL CONTAINER
  controlContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 16,
  },

  // AUTO-PLAY CONTROL
  autoPlayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  autoPlayIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  autoPlayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  autoPlayActive: {
    backgroundColor: "#10b981",
  },
  autoPlayInactive: {
    backgroundColor: "#ef4444",
  },
  autoPlayText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },

  // NAVIGATION CONTAINER
  navigationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  navButton: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0b63a8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(11, 99, 168, 0.1)",
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0b63a8",
  },
  pageIndicator: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pageIndicatorText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },

  // CARD STYLES
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  cardIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#0b63a8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cardIconText: {
    fontSize: 20,
    color: "#fff",
  },
  cardTitle: {
    color: "#0b63a8",
    fontSize: 20,
    fontWeight: "700",
  },
  cardBody: {
    flex: 1,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    color: "#64748b",
    fontSize: 15,
    flex: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  unitText: {
    fontSize: 14,
    color: "#94a3b8",
    marginRight: 4,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  boldValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  // TILE CONTAINER
  tileContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(11, 99, 168, 0.08)",
    overflow: 'visible',
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  tileIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#0b63a8",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#0b63a8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  tileTitle: {
    color: "#0b63a8",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },

  // CONSUMPTION BREAKDOWN
  consumptionBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  consumptionBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  gridBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
  },
  dgBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  consumptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#4b5563",
  },
  consumptionValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  consumptionUnit: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  percentagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gridPill: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  dgPill: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  // TOTAL ROW
  totalRow: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalItem: {
    alignItems: "center",
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },
  
  noteText: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // SANCTIONED LOAD
  sanctionedCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sanctionedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  sanctionedLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  sanctionedValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2e7d32",
  },
  
  sanctionedDivider: {
    height: 1,
    backgroundColor: '#374151',
    opacity: 0.4,
    marginVertical: 0,
  },

  // PHASE SECTION
  phaseSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  phaseSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b63a8",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  phaseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  phaseLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  phaseValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },

  // CHARGES GRID
  chargesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  chargeItem: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  chargeLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: "500",
    textAlign: 'center',
  },
  chargeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },

  // BOTTOM GAP
  bottomGap: {
    height: 40,
  },
});