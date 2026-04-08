import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Rfq, RfqItem } from '@/domain/rfq/types';
import { chunkRfqItems, getReshuffledItems } from '@/domain/rfq/exportHelpers';

// Simplified styles for PDF to ensure high accuracy with components
const styles = StyleSheet.create({
  page: {
    padding: 0,
  },
  segmentContainer: {
    flex: 1,
    padding: 30,
    height: '100%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  titleBlock: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  rfqNumber: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    opacity: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  vendorBlock: {
    textAlign: 'right',
  },
  vendorLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.4,
    marginBottom: 2,
  },
  vendorName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  issueDate: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    opacity: 0.6,
    marginTop: 2,
  },
  
  // Table Styles
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 4,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  tableCell: {
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  cellIndex: { width: 30 },
  cellDesc: { flex: 1, paddingRight: 10 },
  cellSpec: { flex: 0.8, paddingRight: 10 },
  cellQty: { width: 40, textAlign: 'right' },
  cellUnit: { width: 40, paddingLeft: 10 },
  
  itemDesc: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  itemSpec: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    opacity: 0.7,
    lineHeight: 1.3,
  },
  
  noteRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginTop: -4,
  },
  noteCell: {
    flex: 1,
    marginLeft: 30,
    borderLeftWidth: 2,
    paddingLeft: 8,
    paddingTop: 4,
  },
  noteText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    opacity: 0.6,
  },

  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    opacity: 0.3,
    textTransform: 'uppercase',
  },
  pageNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    opacity: 0.3,
  }
});

interface RfqPdfDocumentProps {
  rfq: Rfq;
  items: RfqItem[];
}

export const RfqPdfDocument: React.FC<RfqPdfDocumentProps> = ({ rfq, items }) => {
  const displayItems = getReshuffledItems(rfq, items);
  const chunks = chunkRfqItems(displayItems, 8);

  const colors = {
    bg: rfq.background_color,
    text: rfq.text_color,
    border: rfq.border_color,
    accent: rfq.accent_color,
  };

  return (
    <Document>
      {chunks.map((chunk, i) => (
        <Page key={`pdf_pg_${i}`} size="A4" style={[styles.page, { backgroundColor: colors.bg, color: colors.text }]}>
          <View style={[styles.segmentContainer]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
               <View style={styles.titleBlock}>
                 {i === 0 && rfq.show_brand_name ? (
                     <Text style={[styles.brandName, { color: colors.accent }]}>{rfq.brand_name_override || 'BIGDROPS'}</Text>
                 ) : null}
                 <Text style={styles.docTitle}>{rfq.title || 'REQUEST FOR QUOTE'}</Text>
                 <Text style={styles.rfqNumber}>NO. {rfq.rfq_number}</Text>
               </View>
               
               {rfq.show_vendor_identity && (
                 <View style={styles.vendorBlock}>
                   <Text style={styles.vendorLabel}>Prepared For</Text>
                   <Text style={styles.vendorName}>{rfq.vendor_name || 'GUEST VENDOR'}</Text>
                   <Text style={styles.issueDate}>{rfq.issue_date}</Text>
                 </View>
               )}
            </View>

            {/* Table */}
            <View style={styles.table}>
               <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableHeaderCell, styles.cellIndex]}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellDesc]}>Item / Description</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellSpec]}>Specification</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellQty]}>Qty</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellUnit]}>Unit</Text>
               </View>

               {chunk.map((item, idx) => (
                 <React.Fragment key={item.id || idx}>
                   <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.tableCell, styles.cellIndex, { opacity: 0.4 }]}>{String(idx + 1 + (i * 8)).padStart(2, '0')}</Text>
                      <View style={styles.cellDesc}>
                         <Text style={styles.itemDesc}>{item.description || 'Untitled Item'}</Text>
                      </View>
                      <View style={styles.cellSpec}>
                         {item.specification ? <Text style={styles.itemSpec}>{item.specification}</Text> : null}
                      </View>
                      <Text style={[styles.tableCell, styles.cellQty, { fontFamily: 'Helvetica-Bold' }]}>{item.quantity}</Text>
                      <Text style={[styles.tableCell, styles.cellUnit, { opacity: 0.6, fontSize: 8 }]}>{item.unit || '-'}</Text>
                   </View>
                   {item.notes ? (
                     <View style={[styles.noteRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.noteCell, { borderLeftColor: colors.accent }]}>
                           <Text style={styles.noteText}>{item.notes}</Text>
                        </View>
                     </View>
                   ) : null}
                 </React.Fragment>
               ))}
            </View>

            {/* Page Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
               <Text style={styles.footerBrand}>Bigdrops Procurement Protocol</Text>
               <Text style={styles.pageNumber}>{i + 1} / {chunks.length}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};
