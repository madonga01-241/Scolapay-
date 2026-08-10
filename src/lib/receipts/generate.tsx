import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { formatFcfaAmount } from "@/lib/currency";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 20, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#555" },
  value: { fontWeight: 700 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginVertical: 16 },
  footer: { marginTop: 30, fontSize: 10, color: "#888" },
});

export type ReceiptData = {
  schoolName: string;
  receiptNumber: string;
  studentName: string;
  period: string; // "2026-09"
  amountFcfa: number;
  method: string;
  paidAt: Date;
};

function formatFcfa(amount: number) {
  return formatFcfaAmount(amount);
}

function ReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <Text style={styles.title}>{data.schoolName}</Text>
        <Text>Reçu de paiement de scolarité</Text>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>N° de reçu</Text>
          <Text style={styles.value}>{data.receiptNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Élève</Text>
          <Text style={styles.value}>{data.studentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Période</Text>
          <Text style={styles.value}>{data.period}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Montant</Text>
          <Text style={styles.value}>{formatFcfa(data.amountFcfa)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Moyen de paiement</Text>
          <Text style={styles.value}>{data.method}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{data.paidAt.toLocaleDateString("fr-FR")}</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.footer}>
          Ce reçu confirme le règlement de la scolarité pour la période indiquée. Généré
          automatiquement par ScolaPay.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument data={data} />);
}
