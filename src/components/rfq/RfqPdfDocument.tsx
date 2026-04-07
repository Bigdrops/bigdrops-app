import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Rfq, RfqItem, RFQ_PALETTES } from '@/domain/rfq/types';
import { chunkRfqItems, getReshuffledItems } from '@/domain/rfq/exportHelpers';

// Simplified styles for PDF to ensure high accuracy with components
const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: 'white',
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
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 15,
  },
  titleBlock: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  rfqNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    opacity: 0.4,
    marginTop: 2,
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
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  issueDate: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    opacity: 0.6,
    marginTop: 2,
  },
  itemContainer: {
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'column',
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemUpper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetails: {
    flex: 1,
    marginRight: 15,
  },
  itemDesc: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  itemSpec: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    opacity: 0.6,
    lineHeight: 1.3,
  },
  itemQtyBlock: {
    textAlign: 'right',
    minWidth: 40,
  },
  itemQty: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  itemUnit: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    opacity: 0.4,
  },
  itemNotes: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    opacity: 0.6,
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
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
  const chunks = chunkRfqItems(displayItems, 6);

  const getColors = () => {
    if (rfq.background_mode === 'palette') {
       const palette = RFQ_PALETTES.find(p => p.name === rfq.palette_name) || RFQ_PALETTES[0];
       return { bg: palette.colors[1], text: rfq.text_color || palette.colors[3] };
    }
    return { bg: rfq.background_primary || 'white', text: rfq.text_color || '#111' };
  };

  const c = getColors();

  return (
    <Document>
      {chunks.map((chunk, i) => (
        <Page key={`pdf_pg_${i}`} size="A4" style={[styles.page, { backgroundColor: c.bg, color: c.text }]}>
          <View style={styles.segmentContainer}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: `${c.text}20` }]}>
               <View style={styles.titleBlock}>
                 {i === 0 && rfq.show_brand_name ? (
                     <Text style={[styles.brandName, { color: c.text }]}>{rfq.brand_name_override || 'BIGDROPS'}</Text>
                 ) : null}
                 <Text style={styles.docTitle}>{rfq.title || 'REQUEST FOR QUOTE'}</Text>
                 <Text style={styles.rfqNumber}>#{rfq.rfq_number}</Text>
               </View>
               <View style={styles.vendorBlock}>
                 <Text style={styles.vendorLabel}>Prepared For</Text>
                 <Text style={styles.vendorName}>{rfq.vendor_name || 'GUEST VENDOR'}</Text>
                 <Text style={styles.issueDate}>{rfq.issue_date}</Text>
               </View>
            </View>

            {/* Content Row */}
            <View style={styles.itemContainer}>
               {chunk.map((item, idx) => (
                   <View key={item.id} style={[styles.itemRow, { borderColor: `${c.text}10`, backgroundColor: `${c.text}08` }]}>
                      <View style={styles.itemUpper}>
                         <View style={styles.itemDetails}>
                            <Text style={styles.itemDesc}>{item.description || 'Untitled Item'}</Text>
                            {item.specification && <Text style={styles.itemSpec}>{item.specification}</Text>}
                         </View>
                         <View style={styles.itemQtyBlock}>
                            <Text style={styles.itemQty}>{item.quantity}</Text>
                            <Text style={styles.itemUnit}>{item.unit || 'UNITS'}</Text>
                         </View>
                      </View>
                      {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                   </View>
               ))}
            </View>

            {/* Page Footer */}
            <View style={[styles.footer, { borderTopColor: `${c.text}10` }]}>
               <Text style={styles.footerBrand}>Bigdrops RFQ-PDF v1.0</Text>
               <Text style={styles.pageNumber}>{i + 1} / {chunks.length}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};
