import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C } from './theme';
import { findCustomByBarcode } from './store';
import { lookupBarcode } from './openfoodfacts';
import { Btn, Muted } from './ui';

// Camera barcode scanner. Calls onResult({ food, found, fromMine }) or onNotFound(code).
export default function Scanner({ onResult, onNotFound }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lastCode = useRef(null);

  if (!permission) return <View style={{ flex: 1 }} />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink }}>Camera access is needed to scan barcodes</Text>
        <Muted>The camera is only used while this screen is open.</Muted>
        {permission.canAskAgain
          ? <Btn title="Allow camera" onPress={requestPermission} />
          : <Btn title="Open settings" onPress={() => Linking.openSettings()} />}
      </View>
    );
  }

  async function handle({ data }) {
    if (busy || !data || data === lastCode.current) return;
    lastCode.current = data;
    setBusy(true);
    setError('');
    try {
      const mine = await findCustomByBarcode(data);
      if (mine) return onResult({ food: mine, fromMine: true });
      const res = await lookupBarcode(data);
      if (!res.found) return onNotFound(data);
      onResult({ food: { ...res.food, id: 'off-' + data, unsaved: true } });
    } catch (e) {
      setError("Couldn't look that up. Check the internet connection, or add the product yourself.");
      lastCode.current = null;
      setBusy(false);
      return;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={busy ? undefined : handle}
      />
      <View style={{ position: 'absolute', left: 40, right: 40, top: '35%', height: 160, borderWidth: 3, borderColor: C.accentSoft, borderRadius: 18 }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(58,34,41,0.85)', gap: 10 }}>
        {busy ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Looking up {lastCode.current}…</Text>
          </View>
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600' }}>Point the camera at the barcode on the pack</Text>
        )}
        {error ? <Text style={{ color: '#FFD3DF' }}>{error}</Text> : null}
        <Btn kind="ghost" title="Add a product by hand instead" onPress={() => onNotFound('')} />
      </View>
    </View>
  );
}
