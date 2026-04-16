const TEMPLATE_NAME = "Nexus";

import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

type TemplateProps = {
  data: any;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },

  sectionGap: { marginTop: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0b4f6c',
    paddingBottom: 14,
    marginBottom: 20,
  },

  title: { fontSize: 28, fontWeight: 700, marginBottom: 6 },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },

  metaItem: { marginRight: 16, marginBottom: 6 },

  metaLabel: { fontSize: 10, color: '#4b6589' },
  metaValue: { fontSize: 14, fontWeight: 700 },

  logo: { maxHeight: 60, maxWidth: 160 },

  partyRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },

  partyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d9e1ec',
    padding: 12,
    marginRight: 10,
  },

  partyName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  partyText: { fontSize: 12, marginBottom: 2 },

  tableWrapper: { marginTop: 16 },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cfddee',
    paddingVertical: 6,
  },

  tableHeader: {
    backgroundColor: '#1c3347',
  },

  tableHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
  },

  tableCellText: {
    fontSize: 12,
  },

  groupRow: {
    backgroundColor: '#e4ecf7',
  },

  groupText: {
    fontSize: 12,
    fontWeight: 700,
  },

  descWrap: {
    flexDirection: 'row',
  },

  image: {
    width: 36,
    height: 36,
    marginRight: 6,
  },

  subDesc: {
    fontSize: 10,
    color: '#555',
  },

  totalsContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
  },

  totalsBox: {
    width: 300,
    borderWidth: 1,
    borderColor: '#bdcfe2',
    padding: 12,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  totalMain: {
    fontWeight: 700,
    marginTop: 8,
  },

  advanceBox: {
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#c07c2c',
    paddingLeft: 8,
  },

  bottomRow: {
    flexDirection: 'row',
    marginTop: 24,
  },

  leftCol: { flex: 2, marginRight: 12 },
  rightCol: { flex: 1 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
  },

  sectionText: {
    fontSize: 11,
  },

  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
  },
});

const Template = ({ data }: TemplateProps) => {
  return (
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      {(data?.title || data?.documentNumber || data?.company?.logoUrl) && (
        <View style={styles.header}>
          <View>
            {data?.title && <Text style={styles.title}>{data.title}</Text>}

            <View style={styles.metaRow}>
              {data?.documentNumber && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>{data.documentNumberLabel}</Text>
                  <Text style={styles.metaValue}>{data.documentNumber}</Text>
                </View>
              )}

              {data?.issueDate && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>{data.issueDateLabel}</Text>
                  <Text style={styles.metaValue}>{data.issueDate}</Text>
                </View>
              )}
            </View>
          </View>

          {data?.company?.logoUrl && (
            <Image src={data.company.logoUrl} style={styles.logo} />
          )}
        </View>
      )}

      {/* PARTIES */}
      {(data?.company || data?.client) && (
        <View style={styles.partyRow}>
          {data?.company && (
            <View style={styles.partyCard}>
              {data.company.name && <Text style={styles.partyName}>{data.company.name}</Text>}
              {data.company.address && <Text style={styles.partyText}>{data.company.address}</Text>}
              {data.company.phone && <Text style={styles.partyText}>{data.company.phone}</Text>}
            </View>
          )}

          {data?.client && (
            <View style={styles.partyCard}>
              {data.client.name && <Text style={styles.partyName}>{data.client.name}</Text>}
              {data.client.address && <Text style={styles.partyText}>{data.client.address}</Text>}
              {data.client.phone && <Text style={styles.partyText}>{data.client.phone}</Text>}
            </View>
          )}
        </View>
      )}

      {/* TABLE */}
      {data?.table && (
        <View style={styles.tableWrapper}>
          
          {/* HEADER */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {data.table.columns.map((col: any) => (
              <Text
                key={col.key}
                style={[
                  styles.tableHeaderText,
                  { flex: col.width ? 0 : 1, width: col.width },
                ]}
              >
                {col.label}
              </Text>
            ))}
          </View>

          {/* ROWS */}
          {data.table.rows.map((row: any, i: number) => {
            if (row.type === 'group_header') {
              return (
                <View key={i} style={[styles.tableRow, styles.groupRow]}>
                  <Text style={styles.groupText}>{row.groupName}</Text>
                </View>
              );
            }

            return (
              <View key={i} style={styles.tableRow}>
                {data.table.columns.map((col: any) => {
                  const cell = row.cells?.[col.key];

                  if (col.key === 'description') {
                    return (
                      <View key={col.key} style={{ flex: 1 }}>
                        <View style={styles.descWrap}>
                          {row.imageUrl && <Image src={row.imageUrl} style={styles.image} />}
                          <View>
                            {cell && <Text style={styles.tableCellText}>{cell}</Text>}
                            {row.cells?.subDescription && (
                              <Text style={styles.subDesc}>{row.cells.subDescription}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <Text key={col.key} style={styles.tableCellText}>
                      {cell}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {/* TOTALS */}
      {data?.totals && (
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            {data.totals.lines?.map((line: any, i: number) => (
              <View key={i} style={[styles.totalRow, line.isMain && styles.totalMain]}>
                <Text>{line.label}</Text>
                <Text>{line.value}</Text>
              </View>
            ))}

            {data.advanceSummary && (
              <View style={styles.advanceBox}>
                <Text>{data.advanceSummary.primaryLabel}</Text>
                <Text>{data.advanceSummary.advanceAmount}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* FOOTER */}
      {data?.footer && (
        <View style={styles.footer}>
          <Text>{data.footer.pageNumber}</Text>
          <Text>{data.footer.documentNumber}</Text>
          <Text>{data.footer.companyName}</Text>
        </View>
      )}
    </Page>
  );
};

export default Template;