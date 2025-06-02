import QRCode from "react-qr-code";

export default function ItemQRCode({ itemId, itemName }: { itemId: string; itemName: string }) {
  // Encode a JSON payload for inventory update
  const qrData = JSON.stringify({ type: "raw_material_update", itemId });

  return (
    <div style={{ width: 200, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "white", padding: "4px", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <QRCode value={qrData} size={256} />
      <div style={{ marginTop: 8, textAlign: "center", fontWeight: 500 }}>{itemName}</div>
    </div>
  );
}
