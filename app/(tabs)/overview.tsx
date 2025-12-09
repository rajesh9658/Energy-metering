import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import Swiper from "react-native-swiper";

export default function OverviewScreen() {
  // SWIPER DATA
  const slides = [
    {
      key: "overview",
      title: "Overview",
      icon: "📊",
      rows: [
        { label: "Grid Balance", value: "Rs. 912.97", color: "#2e7d32" },
        { label: "Grid Unit (Live)", value: "11917.00 kWh" },
        { label: "DG Unit", value: "229.79 kWh" },
        { label: "Supply", value: "GRID", color: "#2e7d32", badge: true },
        { label: "Last Updated On", value: "2025-12-08 11:20:48", color: "#0b63a8" },
      ],
      // DYNAMIC DATA FOR MONTHLY CONSUMPTION TILE
      consumptionData: {
        grid: 8.0,
        dg: 0.0,
        total: 8.0,
        gridPercent: "100.00%",
        dgPercent: "0.00%",
      },
    },

    {
      key: "today",
      title: "Today's Consumption",
      icon: "📅",
      rows: [
        { label: "UPPCL (Grid)", value: "45.32", unit: "₹" },
        { label: "UPPCL (FC)", value: "0.00", unit: "₹" },
        { label: "VCAP", value: "0.00", unit: "₹" },
        { label: "FPPAS", value: "2.52", unit: "₹" },
        { label: "Meter Installment", value: "0.00", unit: "₹" },
        { label: "Total", value: "47.84", unit: "₹", color: "#2e7d32", bold: true },
        { label: "Last Updated", value: "11:20:48", color: "#0b63a8" },
      ],
      // DYNAMIC DATA FOR MONTHLY CONSUMPTION TILE
      consumptionData: {
        grid: 9.0,
        dg: 0.0,
        total: 9.0,
        gridPercent: "100.00%",
        dgPercent: "0.00%",
      },
    },

    {
      key: "monthly",
      title: "Monthly Consumption",
      icon: "📈",
      rows: [
        { label: "UPPCL (Grid)", value: "679.80", unit: "₹" },
        { label: "UPPCL (FC)", value: "130.37", unit: "₹" },
        { label: "VCAP", value: "104.79", unit: "₹" },
        { label: "FPPAS", value: "63.51", unit: "₹" },
        { label: "Meter Installment", value: "0.00", unit: "₹" },
        { label: "Total", value: "978.47", unit: "₹", color: "#2e7d32", bold: true },
        { label: "Last Updated", value: "Dec 08, 11:20", color: "#0b63a8" },
      ],
      // DYNAMIC DATA FOR MONTHLY CONSUMPTION TILE
      consumptionData: {
        grid: 120.0,
        dg: 0.11,
        total: 120.11,
        gridPercent: "99.91%",
        dgPercent: "0.09%",
      },
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const swiperRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const userInteractionTimerRef = useRef(null);
  
  const active = slides[activeIndex];
  
  // AUTO-SLIDE CONFIGURATION
  const AUTO_SLIDE_INTERVAL = 4000; // 4 seconds
  const RESUME_DELAY = 8000; // Resume auto-slide after 8 seconds of inactivity

  // STATIC DATA
  const staticData = {
    sanctionedLoad: {
      value: "5.00 kW",
    },
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
    // Pause auto-slide when user interacts
    setIsAutoPlaying(false);
    
    // Clear any existing timers
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
    
    // Resume auto-slide after delay
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

    // Cleanup on unmount
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            
          </View>
          <Text style={styles.customer}>Energy-Metering.!</Text>
        </View>

        {/* SWIPER SECTION - Smart Auto-Slide with User Override */}
        <View style={styles.swiperWrapper}>
          <Swiper
            ref={swiperRef}
            height={340}
            loop={true}
            autoplay={false} // We'll handle auto-slide manually
            showsPagination={true}
            dotStyle={styles.dot}
            activeDotStyle={styles.activeDot}
            onIndexChanged={handleIndexChanged}
            onTouchStart={handleUserInteraction} // Pause on touch
            onTouchEnd={handleUserInteraction} // Pause on touch release
            onScrollBeginDrag={handleUserInteraction} // Pause when dragging starts
            paginationStyle={{ bottom: 10 }}
            scrollEnabled={true}
            bounces={true}
            removeClippedSubviews={false}
            loadMinimal={true}
            loadMinimalSize={1}
          >
            {slides.map((item) => (
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
                              { backgroundColor: row.value === 'GRID' ? '#2e7d32' : '#f39c12' }
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

        {/* DYNAMIC MONTHLY CONSUMPTION TILE - Changes based on active slide */}
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
              <Text style={styles.consumptionUnit}>kWh</Text>
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
              <Text style={styles.consumptionUnit}>kWh</Text>
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
        </View>

        {/* SANCTIONED LOAD TILE - Static */}
        <View style={styles.tileContainer}>
          <View style={styles.tileHeader}>
            <View style={styles.tileIcon}>
              <Text style={{ color: "#fff", fontSize: 20 }}>⚡</Text>
            </View>
            <Text style={styles.tileTitle}>Sanctioned Load</Text>
          </View>
          
          <View style={styles.sanctionedCard}>
            <View style={styles.sanctionedRow}>
              <Text style={styles.sanctionedLabel}>UPPCL (Grid)</Text>
              <Text style={styles.sanctionedValue}>
                {staticData.sanctionedLoad.value}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  container: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: 40,
  },

  
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  meterId: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  customer: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600",
    opacity: 0.9,
  },
  logout: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "600" 
  },

  // SWIPER WRAPPER
  swiperWrapper: {
    height: 400, // Increased to accommodate all controls
    marginBottom: 20,
    marginHorizontal: 16,
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
    paddingHorizontal: 10,
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
    backgroundColor: "#10b981", // Green for active
  },
  autoPlayInactive: {
    backgroundColor: "#ef4444", // Red for inactive
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  pageIndicatorText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },

  // SWIPER CARD
  swiperCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    height: 340,
  },
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
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  // TILE CONTAINER (Dynamic & Static Tiles)
  tileContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
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
  },
  tileTitle: {
    color: "#0b63a8",
    fontSize: 18,
    fontWeight: "700",
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
  },
  gridBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  dgBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
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
  },
  gridPill: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  dgPill: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
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

  // SANCTIONED LOAD
  sanctionedCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  sanctionedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});



// sanjay