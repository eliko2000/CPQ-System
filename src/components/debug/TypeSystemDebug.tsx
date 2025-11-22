/**
 * Temporary Debug Component - Component Type System Verification
 *
 * This component displays the new type classification data to verify
 * the system is working correctly.
 *
 * TO USE: Add this component to QuotationEditor.tsx temporarily
 */

import React from 'react';
import type { QuotationProject } from '../../types';
import { calculateQuotationStatistics } from '../../utils/quotationStatistics';

interface TypeSystemDebugProps {
  quotation: QuotationProject;
}

export function TypeSystemDebug({ quotation }: TypeSystemDebugProps) {
  const { items, calculations } = quotation;

  // Calculate statistics
  let statistics;
  try {
    statistics = calculateQuotationStatistics(quotation);
  } catch (error) {
    statistics = null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: '#00ff00',
      padding: '20px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '600px',
      overflow: 'auto',
      zIndex: 9999,
      border: '2px solid #00ff00',
      boxShadow: '0 4px 12px rgba(0,255,0,0.3)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
        🔍 Type System Debug Panel
      </h3>

      {/* Items Type Breakdown */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '5px' }}>
          📦 Items by Type:
        </div>
        {items.map((item, idx) => (
          <div key={idx} style={{ marginLeft: '10px', marginBottom: '3px' }}>
            <span style={{ color: '#ff6b6b' }}>{item.displayNumber}</span>
            {' '}
            <span style={{ color: '#4ecdc4' }}>{item.componentName.substring(0, 30)}</span>
            <br />
            <span style={{ marginLeft: '20px', color: '#95e1d3' }}>
              Type: {item.itemType}
              {item.laborSubtype && ` → ${item.laborSubtype}`}
            </span>
          </div>
        ))}
      </div>

      {/* Calculations Breakdown */}
      <div style={{ marginBottom: '15px', borderTop: '1px solid #00ff00', paddingTop: '10px' }}>
        <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '5px' }}>
          💰 Calculations (ILS):
        </div>
        <div style={{ marginLeft: '10px' }}>
          <div>Hardware: ₪{calculations.totalHardwareILS.toLocaleString()}</div>
          <div>Software: ₪{calculations.totalSoftwareILS.toLocaleString()}</div>
          <div>Labor: ₪{calculations.totalLaborILS.toLocaleString()}</div>
          <div style={{ marginLeft: '15px', fontSize: '10px', color: '#95e1d3' }}>
            → Engineering: ₪{calculations.totalEngineeringILS.toLocaleString()}
          </div>
          <div style={{ marginLeft: '15px', fontSize: '10px', color: '#95e1d3' }}>
            → Commissioning: ₪{calculations.totalCommissioningILS.toLocaleString()}
          </div>
          <div style={{ marginLeft: '15px', fontSize: '10px', color: '#95e1d3' }}>
            → Installation: ₪{calculations.totalInstallationILS.toLocaleString()}
          </div>
          <div style={{ borderTop: '1px solid #666', marginTop: '5px', paddingTop: '5px' }}>
            <strong>Total: ₪{calculations.subtotalILS.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div style={{ borderTop: '1px solid #00ff00', paddingTop: '10px' }}>
          <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '5px' }}>
            📊 Statistics:
          </div>
          <div style={{ marginLeft: '10px' }}>
            <div>HW:Eng:Comm = {statistics.hwEngineeringCommissioningRatio}</div>
            <div style={{ marginTop: '5px' }}>
              Hardware: {statistics.hardwarePercent}% <br />
              Software: {statistics.softwarePercent}% <br />
              Labor: {statistics.laborPercent}%
            </div>
            {statistics.robotComponents && (
              <div style={{ marginTop: '5px', color: '#ff6b6b' }}>
                🤖 Robots: ₪{statistics.robotComponents.totalCostILS.toLocaleString()}
                ({statistics.robotComponents.percentOfTotal}%)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Component Counts */}
      {statistics && (
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#95e1d3' }}>
          Total: {statistics.componentCounts.total} items
          ({statistics.componentCounts.hardware} HW,
          {statistics.componentCounts.software} SW,
          {statistics.componentCounts.labor} Labor)
        </div>
      )}
    </div>
  );
}
