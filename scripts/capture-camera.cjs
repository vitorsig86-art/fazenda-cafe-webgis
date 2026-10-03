// Prints the development-only browser command, never reads credentials.
console.log(`Start npm run dev and frame the final view.
Use "Capturar câmera" in the development panel at the lower-left map edge.
The panel shows and copies a ready-to-use object with the required precision.
Use "Aplicar câmera capturada" to verify the same rounded values with setView.
The current initial/Home preset is not changed automatically.
The original browser-console workflow also remains available:
window.dispatchEvent(new Event("cardeal:capture-camera"))
Copy the JSON printed into initialCamera in src/projects/fazendaCafe.ts.
All angles are degrees; height is meters above the ellipsoid.
The capture listener is disabled in production builds.`);
