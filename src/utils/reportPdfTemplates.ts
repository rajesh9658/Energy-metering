export interface DailyPdfParams {
  selectedMonth: string;
  selectedYear: string;
  energyUnitMode: string;
  showsKwh: boolean;
  showsKvah: boolean;
  totalKvah: number;
  totalUnits: number;
  totalAmount: number;
  mergedDailyData: Array<{
    day: number | string;
    daily_units?: number;
    daily_kvah?: number;
    daily_kvah_delta?: number;
    daily_amount?: number;
  }>;
  getDailyUnits: (item: any) => number;
  getDailyKvahDelta: (item: any) => number;
  getNumericValue: (val: any, fallback?: number) => number;
  getDailyAmount: (item: any) => number;
}

export function generateDailyPdfHtml(params: DailyPdfParams): string {
  const {
    selectedMonth,
    selectedYear,
    energyUnitMode,
    showsKwh,
    showsKvah,
    totalKvah,
    totalUnits,
    totalAmount,
    mergedDailyData,
    getDailyUnits,
    getDailyKvahDelta,
    getNumericValue,
    getDailyAmount,
  } = params;

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; color: #02569B; margin-bottom: 24px; }
          .summary { background: #f8fafc; padding: 16px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .summary-label { font-weight: 600; color: #64748b; font-size: 13px; }
          .summary-value { font-weight: 700; color: #02569B; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #02569B; color: white; padding: 10px; text-align: left; }
          td { padding: 9px; border: 1px solid #e2e8f0; }
          .total-row { background: #e8f4fd; font-weight: 700; }
          .footer { margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1 class="header">Daily Energy Consumption Report</h1>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Period:</span>
            <span class="summary-value">${selectedMonth} ${selectedYear}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">View Type:</span>
            <span class="summary-value">Daily View</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">${energyUnitMode === 'kvah' ? 'Total kVAh:' : 'Total Units:'}</span>
            <span class="summary-value">${energyUnitMode === 'kvah' ? `${totalKvah.toFixed(2)} kVAh` : `${totalUnits.toFixed(2)} kWh`}</span>
          </div>
          ${showsKwh && showsKvah ? `
          <div class="summary-row">
            <span class="summary-label">Total kVAh:</span>
            <span class="summary-value">${totalKvah.toFixed(2)} kVAh</span>
          </div>` : ''}
          <div class="summary-row">
            <span class="summary-label">Total Amount:</span>
            <span class="summary-value">₹${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>${energyUnitMode === 'kvah' ? 'Units (kVAh)' : 'Units (kWh)'}</th>
              ${showsKwh && showsKvah ? '<th>Units (kVAh)</th>' : ''}
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${mergedDailyData.map((item) => `
              <tr>
                <td>${item.day} ${selectedMonth}</td>
                <td>${energyUnitMode === 'kvah' ? (getNumericValue(item?.daily_kvah_delta ?? getDailyKvahDelta(item), 0)).toFixed(2) : getDailyUnits(item).toFixed(2)}</td>
                ${showsKwh && showsKvah ? `<td>${(getNumericValue(item?.daily_kvah_delta ?? getDailyKvahDelta(item), 0)).toFixed(2)}</td>` : ''}
                <td>₹${getDailyAmount(item).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total</td>
              <td>${energyUnitMode === 'kvah' ? `${totalKvah.toFixed(2)} kVAh` : `${totalUnits.toFixed(2)} kWh`}</td>
              ${showsKwh && showsKvah ? `<td>${totalKvah.toFixed(2)} kVAh</td>` : ''}
              <td>₹${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Generated on: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
        </div>
      </body>
    </html>
  `;
}

export interface MonthlyPdfParams {
  siteName: string;
  meta: {
    meter_number?: string;
    meter_name?: string;
    latest_reading?: string;
    [key: string]: any;
  };
  reports: Array<any>;
  totalEnergy: number;
  totalEnergyAmount: number;
  totalFixed: number;
  totalOther: number;
  totalAmount: number;
  formatDate: (dateStr: string) => string;
  unit?: 'kwh' | 'kvah';
  reportType?: 'daily' | 'monthly';
  reportPeriod?: string;
  showTotalRow?: boolean;
}

export function generateMonthlyPdfHtml(params: MonthlyPdfParams): string {
  const {
    siteName,
    meta,
    reports,
    totalEnergy,
    totalEnergyAmount,
    totalFixed,
    totalOther,
    totalAmount,
    formatDate,
    unit = 'kwh',
    reportType = 'monthly',
    reportPeriod,
    showTotalRow = true,
  } = params;

  const isDaily = reportType === 'daily';
  const isKvah = (unit || '').toLowerCase() === 'kvah';
  const unitLabel = isKvah ? 'KVAH' : 'KWH';
  const reportTitleType = isDaily ? 'Daily' : 'Monthly';

  const currentDateTime = new Date();
  const generatedDate = currentDateTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');
  const generatedTime = currentDateTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const computedTotalEnergy = reports.reduce((sum, r) => {
    const val = isKvah
      ? Number(r.energy_used_kvah ?? r.kvah_used ?? r.kvah_delta ?? r.daily_kvah_delta ?? r.apparent_energy_delta ?? r.daily_kvah ?? 0)
      : Number(r.energy_used ?? r.energy_consumed ?? r.kwh_delta ?? r.daily_units ?? 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const displayTotalEnergy = totalEnergy > 0 ? totalEnergy : computedTotalEnergy;

  const rowsHtml = reports.length > 0
    ? reports.map(report => {
        const openingVal = isKvah
          ? Number(report.opening_kvah ?? report.opening_kVAh ?? report.kvah_open ?? report.kvah_prev ?? 0)
          : Number(report.opening_kwh ?? report.opening_kWh ?? report.kwh_open ?? 0);

        const consumedVal = isKvah
          ? Number(report.energy_used_kvah ?? report.kvah_used ?? report.kvah_delta ?? report.daily_kvah_delta ?? report.apparent_energy_delta ?? report.daily_kvah ?? 0)
          : Number(report.energy_used ?? report.energy_consumed ?? report.kwh_delta ?? report.daily_units ?? 0);

        const closingVal = isKvah
          ? Number(report.closing_kvah ?? report.closing_kVAh ?? report.kvah_close ?? (openingVal > 0 && consumedVal > 0 ? openingVal + consumedVal : 0))
          : Number(report.closing_kwh ?? report.closing_kWh ?? report.kwh_close ?? (openingVal > 0 && consumedVal > 0 ? openingVal + consumedVal : 0));

        const energyAmount = Number(report.energy_amount || 0);
        const fixedCharges = Number((report.fixed_mains || 0) + (report.fixed_dg || 0));
        const otherCharges = Number(report.other_charges || 0);
        const totalRowAmount = Number(report.total_row_amount || report.total_amount || 0);
        const tariff = Number(report.eb_tariff || report.tariff_rate || 0);

        return `
          <tr>
              <td class="numeric">${formatDate(report.date)}</td>
              <td class="numeric">${meta.meter_number || report.meter_id || ''}</td>
              <td class="numeric">${openingVal.toFixed(2)}</td>
              <td class="numeric">${closingVal.toFixed(2)}</td>
              <td class="numeric">${consumedVal.toFixed(2)}</td>
              <td class="numeric">${tariff.toFixed(2)}</td>
              <td class="numeric">${energyAmount.toFixed(2)}</td>
              <td class="numeric">${fixedCharges.toFixed(2)}</td>
              <td class="numeric">${otherCharges.toFixed(2)}</td>
              <td class="numeric">${totalRowAmount.toFixed(2)}</td>
              <td class="numeric">${(Number(report.opening_balance) || 0).toFixed(2)}</td>
              <td class="numeric">${(Number(report.closing_balance) || 0).toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="12" style="text-align:center; font-style:italic;">No consumption data available for this period</td></tr>';

  const totalRowHtml = showTotalRow && reports.length > 0
    ? `
      <tr class="total-row">
          <td colspan="4" class="total-label">TOTAL:</td>
          <td class="numeric">${displayTotalEnergy.toFixed(2)}</td>
          <td class="numeric">0.00</td>
          <td class="numeric">0.00</td>
          <td class="numeric">0.00</td>
          <td class="numeric">0.00</td>
          <td class="numeric">0.00</td>
          <td colspan="2"></td>
      </tr>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${reportTitleType} Meter Report (${unitLabel})</title>
        <style>
            @page { size: A4 landscape; margin: 10mm 6mm; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: #000;
                margin: 0;
                padding: 0;
                line-height: 1.2;
                -webkit-print-color-adjust: exact;
                background-color: #fff;
            }
            .container { width: 100%; max-width: 100%; overflow: hidden; padding-top: 5px; }
            .header { display: flex; align-items: center; border-bottom: 1px solid #000; padding: 0; margin: 0 0 2px 0; }
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
            .meter-info-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 16px; }
            .meter-info-table td { padding: 6px 8px; border: none; text-align: left; vertical-align: middle; line-height: 1.2; }
            .meter-label { font-weight: bold; color: #000; width: 18%; text-align: right; padding-right: 6px; font-size: 12px; }
            .meter-separator { width: 10px; text-align: center; font-weight: bold; color: #000; font-size: 16px; }
            .meter-value { font-weight: bold; color: #000; padding-left: 6px; font-size: 12px; background-color: #fff; }
            .main-table { width: 100%; border-collapse: collapse; font-size: 10pt; table-layout: fixed; }
            .main-table th {
                background-color: #1F4E79;
                color: #fff !important;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 9pt;
                padding: 5px 3px;
                text-align: center;
                border: 1px solid #fff;
            }
            .main-table td {
                border: 1px solid #fff;
                padding: 4px 2px;
                text-align: center;
                vertical-align: middle;
                font-size: 10pt;
                font-weight: bold;
            }
            .main-table tr:nth-child(even) { background-color: #f2f2f2; }
            .numeric { text-align: right; padding-right: 6px; }
            .total-row { background-color: #ccc; font-weight: bold; border-top: 2px solid #000; font-size: 11pt; }
            .total-label { text-align: right; padding-right: 8px; }
            .footer {
                margin-top: 8px;
                padding-top: 6px;
                border-top: 1px solid #000;
                text-align: center;
                font-size: 10pt;
                font-weight: bold;
            }
            @media print {
                * { color: #000 !important; font-weight: bold !important; }
                body { font-size: 10pt; line-height: 1.1; margin-top: 4mm; }
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
                <div class="header-title">${siteName}${reportType === 'daily' ? ' - DAILY REPORT' : ''}</div>
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
                        <th>OPENING ${unitLabel}</th>
                        <th>CLOSING ${unitLabel}</th>
                        <th>ENERGY CONSUMED (${unitLabel})</th>
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
                    ${rowsHtml}
                    ${totalRowHtml}
                </tbody>
            </table>

            <div class="footer">
                Generated on: ${generatedDate} ${generatedTime} | Page 1 of 1
            </div>
        </div>
    </body>
    </html>
  `;
}

export interface MonthlyBillPdfParams {
  siteName: string;
  meta: {
    meter_number?: string;
    meter_name?: string;
    latest_reading?: string;
    [key: string]: any;
  };
  user?: any;
  billingMonth: string; // e.g. "2026-09"
  billPeriod: string; // e.g. "01/09/2026 - 30/09/2026"
  billDate?: string; // e.g. "2026-10-01 00:00:00"
  billNumber?: string; // e.g. "BILL-202609-115"
  unit?: 'kwh' | 'kvah';

  // Readings
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  mainsEnergyCharge: number;

  dgPreviousReading?: number;
  dgCurrentReading?: number;
  dgUnitsConsumed?: number;
  dgRatePerUnit?: number;
  dgEnergyCharge?: number;

  // Charges
  serverRent?: number;
  fixedChargesMains?: number;
  fixedChargesDg?: number;
  totalCurrentMonthCharges: number;

  // Balances & Recharges
  previousOpeningBalance: number;
  recharges: Array<{ date: string; type: string; amount: number }>;
  totalRechargePaid: number;
  remainingWalletBalance: number;
}

export function generateMonthlyBillPdfHtml(params: MonthlyBillPdfParams): string {
  const {
    siteName,
    meta,
    user,
    billingMonth,
    billPeriod,
    billDate = `${billingMonth}-01 00:00:00`,
    billNumber = `BILL-${billingMonth.replace('-', '')}-${meta.meter_number || '115'}`,
    unit = 'kvah',
    previousReading = 0,
    currentReading = 0,
    unitsConsumed = 0,
    ratePerUnit = 0,
    mainsEnergyCharge = 0,
    dgPreviousReading = 0,
    dgCurrentReading = 0,
    dgUnitsConsumed = 0,
    dgRatePerUnit = 1,
    dgEnergyCharge = 0,
    serverRent = 0,
    fixedChargesMains = 0,
    fixedChargesDg = 0,
    totalCurrentMonthCharges = 0,
    previousOpeningBalance = 0,
    recharges = [],
    totalRechargePaid = 0,
    remainingWalletBalance = 0,
  } = params;

  const unitLabel = (unit || '').toUpperCase() === 'KVAH' ? 'kVAh' : 'kWh';

  const fmt = (num: number, decimals: number = 2) => {
    const val = Number(num) || 0;
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const customerName = meta.meter_name || user?.name || user?.site_name || siteName || 'TESTING';
  const meterNo = meta.meter_number || user?.meter_number || 'N/A';
  const phoneNo = [user?.email, user?.phone || user?.mobile].filter(Boolean).join(', ') || 'N/A';
  const shopFlatNo = user?.shop_no || user?.flat_no || '-';
  const address = user?.address || '-';
  const loadMain = user?.load_main || user?.load || '45.00';
  const loadDg = user?.load_dg || '0.00';

  const rechargesHtml = recharges.length > 0
    ? recharges.map(r => `
        <tr>
            <td style="text-align: left; padding-left: 8px;">${r.date}</td>
            <td style="text-align: center;">${r.type || 'Recharge'}</td>
            <td style="text-align: right; padding-right: 8px;">${fmt(r.amount, 2)}</td>
        </tr>
      `).join('')
    : `
        <tr>
            <td colspan="2" style="text-align: center; font-style: italic; color: #666;">No recharges recorded for this month</td>
            <td style="text-align: right; padding-right: 8px;">0.00</td>
        </tr>
      `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Monthly Bill - ${customerName} (${billingMonth})</title>
        <style>
            @page { size: A4 portrait; margin: 6mm 8mm; }
            body {
                font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                color: #000;
                margin: 0;
                padding: 0;
                font-size: 10px;
                line-height: 1.25;
                background-color: #fff;
                -webkit-print-color-adjust: exact;
            }
            .invoice-box {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
            }
            .company-header {
                background-color: #388E3C;
                color: #fff;
                text-align: center;
                padding: 8px 4px;
                margin-bottom: 6px;
            }
            .company-title {
                font-size: 15px;
                font-weight: bold;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
                text-transform: uppercase;
            }
            .company-sub {
                font-size: 9px;
                margin-bottom: 2px;
            }
            .company-contact {
                font-size: 8.5px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 6px;
                font-size: 9.5px;
            }
            th, td {
                border: 1px solid #222;
                padding: 3px 6px;
                vertical-align: middle;
            }
            .sec-hdr {
                background-color: #f2f2f2;
                font-weight: bold;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                padding: 3px 6px;
            }
            .label-cell {
                font-weight: bold;
                background-color: #fafafa;
                width: 18%;
            }
            .val-cell {
                width: 32%;
            }
            .tbl-hdr th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: center;
                font-size: 9.5px;
                padding: 3px 4px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .total-row {
                font-weight: bold;
                background-color: #f9f9f9;
            }
            .notes-box {
                margin-top: 10px;
                text-align: center;
                font-size: 9px;
                line-height: 1.4;
            }
            .notes-title {
                font-weight: bold;
                margin-bottom: 4px;
            }
            .billing-month-footer {
                margin-top: 6px;
                font-weight: bold;
                font-size: 9.5px;
            }
            @media print {
                body { margin: 0; padding: 0; }
                .company-header { background-color: #388E3C !important; color: #fff !important; }
            }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <!-- Header Banner -->
            <div class="company-header">
                <div class="company-title">SOCHIOT INNOVATION PVT. LTD.</div>
                <div class="company-sub">Noida sector 63, H-141, Noida sec-63</div>
                <div class="company-contact">Contact: 1234567890 | sales@sochiot.com | GST/Service Tax No: 29AAAGM0289C1ZF</div>
            </div>

            <!-- Provider & Bill Info -->
            <table>
                <tr>
                    <td class="sec-hdr" style="width: 50%;">BILLED BY (ADMIN / PROVIDER)</td>
                    <td class="sec-hdr" style="width: 50%;">BILL INFORMATION</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; line-height: 1.4;">
                        <strong>Sochiot Innovation Pvt. Ltd.</strong><br>
                        Noida sector 63, H-141, Noida sec-63<br>
                        <strong>Phone:</strong> 1234567890<br>
                        <strong>Email:</strong> sales@sochiot.com<br>
                        <strong>GST/Service Tax No:</strong> 29AAAGM0289C1ZF
                    </td>
                    <td style="vertical-align: top; line-height: 1.4;">
                        <strong>Bill No:</strong> ${billNumber}<br>
                        <strong>Bill Date:</strong> ${billDate}<br>
                        <strong>Bill Period:</strong> ${billPeriod}<br>
                        <strong>Billing Month:</strong> ${billingMonth}
                    </td>
                </tr>
            </table>

            <!-- Consumer / Site Details -->
            <table>
                <tr>
                    <td colspan="4" class="sec-hdr">CONSUMER / SITE DETAILS</td>
                </tr>
                <tr>
                    <td class="label-cell">Customer Name</td>
                    <td class="val-cell">${customerName}</td>
                    <td class="label-cell">Shop / Flat No.</td>
                    <td class="val-cell">${shopFlatNo}</td>
                </tr>
                <tr>
                    <td class="label-cell">Address</td>
                    <td class="val-cell">${address}</td>
                    <td class="label-cell">Cust Meter No</td>
                    <td class="val-cell">${meterNo}</td>
                </tr>
                <tr>
                    <td class="label-cell">Phone No</td>
                    <td class="val-cell">${phoneNo}</td>
                    <td class="label-cell">Credit Limit</td>
                    <td class="val-cell">0.00</td>
                </tr>
                <tr>
                    <td class="label-cell">Load Main (W)</td>
                    <td class="val-cell">${loadMain}</td>
                    <td class="label-cell">Load DG (W)</td>
                    <td class="val-cell">${loadDg}</td>
                </tr>
                <tr>
                    <td class="label-cell">Area (Sq. Ft.)</td>
                    <td class="val-cell">N/A</td>
                    <td class="label-cell"></td>
                    <td class="val-cell"></td>
                </tr>
            </table>

            <!-- Meter Reading Details -->
            <table>
                <tr>
                    <td colspan="7" class="sec-hdr">Meter Reading Details (${unitLabel})</td>
                </tr>
                <tr class="tbl-hdr">
                    <th>Type</th>
                    <th>Date</th>
                    <th>Previous</th>
                    <th>Current</th>
                    <th>Units (${unitLabel})</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td class="text-left font-bold">DG (${unitLabel})</td>
                    <td class="text-center">${billPeriod.split('-')[1]?.trim() || billPeriod}</td>
                    <td class="text-right">${fmt(dgPreviousReading, 4)}</td>
                    <td class="text-right">${fmt(dgCurrentReading, 4)}</td>
                    <td class="text-right">${fmt(dgUnitsConsumed, 4)}</td>
                    <td class="text-right">${fmt(dgRatePerUnit, 2)}</td>
                    <td class="text-right">${fmt(dgEnergyCharge, 2)}</td>
                </tr>
                <tr>
                    <td class="text-left font-bold">Mains (${unitLabel})</td>
                    <td class="text-center">${billPeriod.split('-')[1]?.trim() || billPeriod}</td>
                    <td class="text-right">${fmt(previousReading, 4)}</td>
                    <td class="text-right">${fmt(currentReading, 4)}</td>
                    <td class="text-right">${fmt(unitsConsumed, 4)}</td>
                    <td class="text-right">${fmt(ratePerUnit, 2)}</td>
                    <td class="text-right">${fmt(mainsEnergyCharge, 2)}</td>
                </tr>
            </table>

            <!-- Recharge Details -->
            <table>
                <tr>
                    <td colspan="3" class="sec-hdr">Recharge Details</td>
                </tr>
                <tr class="tbl-hdr">
                    <th style="width: 35%;">Date</th>
                    <th style="width: 35%;">Type</th>
                    <th style="width: 30%;">Amount</th>
                </tr>
                ${rechargesHtml}
                <tr class="total-row">
                    <td colspan="2" class="font-bold text-left" style="padding-left: 8px;">Total Recharge</td>
                    <td class="font-bold text-right" style="padding-right: 8px;">${fmt(totalRechargePaid, 2)}</td>
                </tr>
            </table>

            <!-- Summary Breakdown -->
            <table>
                <tr>
                    <td colspan="2" class="sec-hdr">Summary Breakdown</td>
                </tr>
                <tr>
                    <td style="width: 70%; padding-left: 8px;">Mains Energy Charge</td>
                    <td style="width: 30%; text-align: right; padding-right: 8px;">${fmt(mainsEnergyCharge, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">DG Energy Charge</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(dgEnergyCharge, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">Server Rent</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(serverRent, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">Fixed Charges (Mains)</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(fixedChargesMains, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">Fixed Charges (DG)</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(fixedChargesDg, 2)}</td>
                </tr>
                <tr class="font-bold" style="background-color: #fafafa;">
                    <td style="padding-left: 8px;">Total Current Month Charges</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(totalCurrentMonthCharges, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">Previous Opening Balance</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(previousOpeningBalance, 2)}</td>
                </tr>
                <tr>
                    <td style="padding-left: 8px;">Total Recharge Paid</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(totalRechargePaid, 2)}</td>
                </tr>
                <tr class="font-bold total-row">
                    <td style="padding-left: 8px;">Remaining Wallet Balance</td>
                    <td style="text-align: right; padding-right: 8px;">${fmt(remainingWalletBalance, 2)}</td>
                </tr>
            </table>

            <!-- Notes -->
            <div class="notes-box">
                <div class="notes-title">Notes:</div>
                <div>1. Please pay before due date to avoid disconnection.</div>
                <div>2. For any discrepancies, contact within 7 days of bill generation.</div>
                <div>3. Payment can be made via Cash/Bank Transfer.</div>
                <div class="billing-month-footer">Billing Month: ${billingMonth}</div>
            </div>
        </div>
    </body>
    </html>
  `;
}

