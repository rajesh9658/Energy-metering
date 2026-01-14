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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  getSiteDataUrl, 
  getMeterCurrentUrl, 
  getMeterDailyConsumptionUrl, 
  getMeterMonthlyConsumptionUrl 
} from "../config";
import { useAuth } from "../context/AuthContext";

const { width: screenWidth } = Dimensions.get('window');

// Utility function to load site info
const loadSiteInfo = async () => {
  try {
    // Try to get from AsyncStorage first
    const userData = await AsyncStorage.getItem("userData");
    
    if (userData) {
      const parsedData = JSON.parse(userData);
      return {
        siteName: parsedData.site_name,
        siteId: parsedData.site_id,
        slug: parsedData.slug,
        user: parsedData
      };
    }
    
    // If no data in storage
    return {
      siteName: null,
      siteId: null,
      slug: null,
      user: null
    };
    
  } catch (error) {
    return {
      siteName: null,
      siteId: null,
      slug: null,
      user: null
    };
  }
};

export default function OverviewScreen({ route }) {
  // AuthContext से data लें
  const { user, getSiteId, getSlug, getSiteName } = useAuth();
  
  // State for site info
  const [siteInfo, setSiteInfo] = useState({
    siteName: null,
    siteId: null,
    slug: null,
    user: null
  });
  
  const [isLoadingSiteInfo, setIsLoadingSiteInfo] = useState(true);

  // Load site info on component mount and when user changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingSiteInfo(true);
        
        // Priority 1: AuthContext से (most recent)
        const authSiteId = getSiteId();
        const authSiteName = getSiteName();
        const authSlug = getSlug();
        
        if (authSiteId && authSiteName) {
          setSiteInfo({
            siteName: authSiteName,
            siteId: authSiteId,
            slug: authSlug,
            user: user
          });
          setIsLoadingSiteInfo(false);
          return;
        }
        
        // Priority 2: AsyncStorage से load करें
        const storageSiteInfo = await loadSiteInfo();
        
        if (storageSiteInfo.siteId && storageSiteInfo.siteName) {
          setSiteInfo(storageSiteInfo);
        } else {
          // No site info available - show error or redirect to login
          setError("No site information found. Please login again.");
        }
        
      } catch (error) {
        setError("Error loading site information");
      } finally {
        setIsLoadingSiteInfo(false);
      }
    };
    
    loadInitialData();
  }, [user]);

  // STATE FOR API DATA
  const [siteData, setSiteData] = useState(null);
  const [meterCurrentData, setMeterCurrentData] = useState(null);
  const [meterDailyData, setMeterDailyData] = useState(null);
  const [meterMonthlyData, setMeterMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // SWIPER DATA
  const [slides, setSlides] = useState([
    {
      key: "current",
      title: "Current Reading",
      icon: "🔋",
      rows: [
        { label: "Opening Reading", value: "Loading... kWh" },
        { label: "Closing Reading", value: "Loading... kWh" },
        { label: "Today's Consumption", value: "Loading... kWh", color: "#2e7d32" },
        { label: "Grid Balance", value: "Loading..." },
        { label: "Last Reading Time", value: "Loading...", color: "#0b63a8" },
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
        { label: "Total Days", value: "Loading..." },
        { label: "Today's Reading", value: "Loading... kWh" },
        { label: "Consumption Trend", value: "Loading..." },
        { label: "Average Daily", value: "Loading... kWh" },
        { label: "Peak Consumption", value: "Loading... kWh" },
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
        { label: "Month Status", value: "Loading..." },
        { label: "Opening Reading", value: "Loading... kWh" },
        { label: "Closing Reading", value: "Loading... kWh" },
        { label: "Total Consumption", value: "Loading... kWh", color: "#2e7d32" },
        { label: "Updated Till", value: "Loading...", color: "#0b63a8" },
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

  // STATIC DATA
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

  // FETCH ALL DATA
  useEffect(() => {
    if (siteInfo.siteId && siteInfo.siteName && !isLoadingSiteInfo) {
      fetchAllData();
    }
  }, [siteInfo, isLoadingSiteInfo]);

  const fetchAllData = async () => {
    if (!siteInfo.siteId || !siteInfo.siteName) {
      setError("Site information not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all APIs in parallel
      await Promise.all([
        fetchSiteData(),
        fetchMeterCurrentData(),
        fetchMeterDailyData(),
        fetchMeterMonthlyData()
      ]);
      
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSiteData = async () => {
    try {
      // Use slug if available, otherwise use siteName
      const slugToUse = siteInfo.slug || siteInfo.siteName;
      if (!slugToUse) return;
      
      const response = await axios.get(getSiteDataUrl(slugToUse));
      
      if (response.data && response.data.success) {
        setSiteData(response.data);
        updateSanctionedLoad(response.data.asset_information);
        updateVoltageCurrentData(response.data.asset_information.electric_parameters);
      }
    } catch (err) {
      // Don't set global error for this - just log it
    }
  };

  const fetchMeterCurrentData = async () => {
    try {
      const response = await axios.get(getMeterCurrentUrl(siteInfo.siteId));
      
      if (response.data) {
        setMeterCurrentData(response.data);
        updateCurrentSlide(response.data);
      }
    } catch (err) {
      // Don't set global error for this - just log it
    }
  };

  const fetchMeterDailyData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await axios.get(getMeterDailyConsumptionUrl(siteInfo.siteId, currentMonth));
      
      if (response.data) {
        setMeterDailyData(response.data);
        updateTodaySlide(response.data);
      }
    } catch (err) {
      // Don't set global error for this - just log it
    }
  };

  const fetchMeterMonthlyData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await axios.get(getMeterMonthlyConsumptionUrl(siteInfo.siteId, currentMonth));
      
      if (response.data) {
        setMeterMonthlyData(response.data);
        updateMonthlySlide(response.data);
      }
    } catch (err) {
      // Don't set global error for this - just log it
    }
  };

  // Update Current Slide
  const updateCurrentSlide = (data) => {
    if (!data) return;
    
    const newSlides = [...slides];
    const todayConsumption = data.closing_kwh - data.opening_kwh;
    
    newSlides[0].rows = [
      { 
        label: "Opening Reading", 
        value: `${data.opening_kwh?.toFixed(2) || "0.00"} kWh`
      },
      { 
        label: "Closing Reading", 
        value: `${data.closing_kwh?.toFixed(2) || "0.00"} kWh`
      },
      { 
        label: "Today's Consumption", 
        value: `${todayConsumption.toFixed(2)} kWh`, 
        color: "#2e7d32"
      },
      { 
        label: "Grid Balance", 
        value: `Rs. ${data.balance || "0"}`
      },
      { 
        label: "Last Reading Time", 
        value: formatDateTime(data.reading_time), 
        color: "#0b63a8"
      },
    ];

    newSlides[0].consumptionData = {
      grid: todayConsumption,
      dg: 0,
      total: todayConsumption,
      gridPercent: "100.00%",
      dgPercent: "0.00%",
    };

    setSlides(newSlides);
  };

  // Update Today Slide
  const updateTodaySlide = (data) => {
    if (!data || !data.data || data.data.length === 0) return;
    
    const newSlides = [...slides];
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')} ${today.toLocaleString('default', { month: 'short' })}`;
    
    const todayData = data.data.find(item => item.day === todayStr);
    const totalDays = data.data.length;
    
    const totalConsumption = data.data.reduce((sum, item) => sum + (item.kwh_delta || 0), 0);
    const averageDaily = totalDays > 0 ? totalConsumption / totalDays : 0;
    
    const peakConsumption = Math.max(...data.data.map(item => item.kwh_delta || 0));
    
    const lastDay = data.data[data.data.length - 1];
    const trend = lastDay ? (lastDay.kwh_delta > averageDaily ? "↗ Increasing" : "↘ Decreasing") : "N/A";
    
    newSlides[1].rows = [
      { 
        label: "Total Days", 
        value: totalDays.toString()
      },
      { 
        label: "Today's Reading", 
        value: todayData ? `${(todayData.kwh_delta || 0).toFixed(2)} kWh` : "N/A"
      },
      { 
        label: "Consumption Trend", 
        value: trend,
        color: trend.includes("Increasing") ? "#ef4444" : "#2e7d32"
      },
      { 
        label: "Average Daily", 
        value: `${averageDaily.toFixed(2)} kWh`
      },
      { 
        label: "Peak Consumption", 
        value: `${peakConsumption.toFixed(2)} kWh`
      },
    ];

    const todayValue = todayData ? todayData.kwh_delta : 0;
    newSlides[1].consumptionData = {
      grid: todayValue,
      dg: 0,
      total: todayValue,
      gridPercent: "100.00%",
      dgPercent: "0.00%",
    };

    setSlides(newSlides);
  };

  // Update Monthly Slide
  const updateMonthlySlide = (data) => {
    if (!data) return;
    
    const newSlides = [...slides];
    
    newSlides[2].rows = [
      { 
        label: "Month Status", 
        value: data.status === "running" ? "🟢 Running" : "🟡 Pending",
        color: data.status === "running" ? "#2e7d32" : "#f59e0b"
      },
      { 
        label: "Opening Reading", 
        value: `${(data.opening_kwh || 0).toFixed(2)} kWh`
      },
      { 
        label: "Closing Reading", 
        value: `${(data.closing_kwh || 0).toFixed(2)} kWh`
      },
      { 
        label: "Total Consumption", 
        value: `${(data.total_kwh || 0).toFixed(2)} kWh`, 
        color: "#2e7d32"
      },
      { 
        label: "Updated Till", 
        value: formatDateTime(data.upto), 
        color: "#0b63a8"
      },
    ];

    newSlides[2].consumptionData = {
      grid: data.total_kwh || 0,
      dg: 0,
      total: data.total_kwh || 0,
      gridPercent: "100.00%",
      dgPercent: "0.00%",
    };

    setSlides(newSlides);
  };

  // Helper function to format date time
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "N/A";
    
    try {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [day, month, year] = datePart.split('-');
      const formattedDate = new Date(`${year}-${month}-${day}T${timePart}`);
      
      return formattedDate.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateTimeStr;
    }
  };

  // Handle pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const updateSanctionedLoad = (assetInfo) => {
    if (!assetInfo) return;
    
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

  // Show loading while site info is being loaded
  if (isLoadingSiteInfo) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b63a8" />
          <Text style={styles.loadingText}>Loading site information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if no site info
  if (!siteInfo.siteId || !siteInfo.siteName) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Site Information Not Found</Text>
          <Text style={styles.errorSubText}>
            Please login again to access site data.
          </Text>
          <Text style={styles.errorSubText}>
            Current user: {user?.name || "Not logged in"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // LOADING STATE for API data
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b63a8" />
          <Text style={styles.loadingText}>Loading meter data...</Text>
          <Text style={styles.siteInfoText}>
            Site: {siteInfo.siteName} | ID: {siteInfo.siteId}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ERROR STATE for API data
  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading data</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <Text style={styles.siteInfoText}>
            Site: {siteInfo.siteName} | ID: {siteInfo.siteId}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchAllData}
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
        {/* HEADER SECTION */}
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
                        <Text style={[
                          styles.rowValue,
                          { color: row.color || "#1e293b" },
                        ]}>
                          {row.value}
                        </Text>
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
              {active.key === "current" ? "Today's Consumption" : 
               active.key === "today" ? "Daily Consumption" : "Monthly Consumption"}
            </Text>
          </View>
          
          <View style={styles.consumptionBreakdown}>
            {/* Grid */}
            <View style={[styles.consumptionBox, styles.gridBox]}>
              <Text style={styles.consumptionLabel}>Consumption</Text>
              <Text style={styles.consumptionValue}>
                {active.consumptionData.grid.toFixed(2)}
              </Text>
              <Text style={styles.consumptionUnit}>
                {active.key === "monthly" ? "kWh" : "kWh"}
              </Text>
              <View style={[styles.percentagePill, styles.gridPill]}>
                <Text style={styles.percentageText}>
                  {active.consumptionData.gridPercent}
                </Text>
              </View>
            </View>
            
            {active.key === "today" && meterDailyData && (
              <View style={[styles.consumptionBox, styles.dgBox]}>
                <Text style={styles.consumptionLabel}>Days Tracked</Text>
                <Text style={styles.consumptionValue}>
                  {meterDailyData.data?.length || 0}
                </Text>
                <Text style={styles.consumptionUnit}>
                  Days
                </Text>
                <View style={[styles.percentagePill, styles.dgPill]}>
                  <Text style={styles.percentageText}>
                    This Month
                  </Text>
                </View>
              </View>
            )}
            
            {active.key !== "today" && (
              <View style={[styles.consumptionBox, styles.dgBox]}>
                <Text style={styles.consumptionLabel}>Status</Text>
                <Text style={styles.consumptionValue}>
                  {active.key === "current" ? "Live" : 
                   active.key === "monthly" ? (meterMonthlyData?.status === "running" ? "Active" : "Pending") : "N/A"}
                </Text>
                <Text style={styles.consumptionUnit}>
                  {active.key === "current" ? "Updated" : "Month"}
                </Text>
                <View style={[styles.percentagePill, styles.dgPill]}>
                  <Text style={styles.percentageText}>
                    {active.key === "current" ? "🔴 Live" : "🟢 Good"}
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Total Row */}
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {active.consumptionData.total.toFixed(2)} kWh
              </Text>
            </View>
            {meterCurrentData && active.key === "current" && (
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Opening</Text>
                <Text style={styles.totalValue}>
                  {meterCurrentData.opening_kwh?.toFixed(2) || "0.00"} kWh
                </Text>
              </View>
            )}
            {meterCurrentData && active.key === "current" && (
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Closing</Text>
                <Text style={styles.totalValue}>
                  {meterCurrentData.closing_kwh?.toFixed(2) || "0.00"} kWh
                </Text>
              </View>
            )}
            {active.key === "today" && meterDailyData && meterDailyData.data && (
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Peak</Text>
                <Text style={styles.totalValue}>
                  {Math.max(...meterDailyData.data.map(item => item.kwh_delta || 0)).toFixed(2)} kWh
                </Text>
              </View>
            )}
            {active.key === "monthly" && meterMonthlyData && (
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Avg/Day</Text>
                <Text style={styles.totalValue}>
                  {((meterMonthlyData.total_kwh || 0) / new Date().getDate()).toFixed(2)} kWh
                </Text>
              </View>
            )}
          </View>
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

// STYLES (same as before with small additions)
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 16,
  },
  siteInfoText: {
    marginTop: 5,
    color: '#94a3b8',
    fontSize: 14,
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
    marginBottom: 5,
  },
  retryButton: {
    backgroundColor: '#0b63a8',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
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
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  siteName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b63a8',
  },
  siteDetails: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
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