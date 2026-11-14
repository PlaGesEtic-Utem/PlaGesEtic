# Hallazgos de Seguridad - Actividad 74

## H-25 (RECLASIFICADO - RIESGO ACEPTADO): adm-zip con CVEs

**Estado original:** Crítico.
**Estado tras aclaración del equipo:** Aceptado con justificación técnica.

**Paquete:** `adm-zip <=0.6.0`
**Usado en:** `src/services/exportacionesService.js` (Act 60/62)
**CVEs reportados:** 8 CVEs de severidad alta (DoS, symlink, SUID, bypass, etc.)

**Justificación de la reclasificación (aportada por Benjamín Arias):**
1. El backend **solo recibe PDFs** en cargas de usuario (no acepta ZIPs subidos por participantes).
2. El límite de subida es de **10 MB**, lo que mitiga el vector de "4GB memory allocation".
3. `adm-zip` se usa exclusivamente para **CREAR** los ZIPs de exportación (no para **EXTRAER** ZIPs de entrada).
4. Las 8 CVEs son sobre extracción de ZIPs maliciosos. Si no hay endpoint que extraiga ZIPs del usuario, la superficie de ataque es mínima.

**Riesgo real actual:** BAJO.
**Riesgo futuro:** MEDIO, si en alguna actividad futura (importación masiva, restauración de backups, migración) se agrega un endpoint que reciba ZIPs del usuario.

**Decisión:**
- Se acepta el riesgo en el contexto actual.
- Se actualizará `adm-zip@0.6.1` cuando haya tiempo y se re-probarán las exportaciones de la Act 60/62.
- Si en el futuro se agrega un endpoint que reciba ZIPs, se deberá:
  - Actualizar `adm-zip` obligatoriamente.
  - Agregar límite de tamaño descomprimido (`maxOutputLength`).
  - Validar que no haya symlinks en el ZIP antes de extraer.

## O-01 (OBSERVACIÓN): CORS no emite Access-Control-Allow-Origin

**Contexto:** `curl -sI -H "Origin: http://localhost:5173" http://localhost:3000/salud` responde sin `Access-Control-Allow-Origin`.

**Análisis:**
- El frontend actual (`frontend/prototipo.html`) se abre con `file://` en desarrollo, y no requiere CORS.
- En producción, si el frontend y el backend se sirven desde el mismo origen, no requiere CORS.
- Si en el futuro el frontend se sirve desde un dominio distinto, habrá que configurar CORS con whitelist explícita.

**Riesgo actual:** BAJO (no bloquea el flujo actual).
**Acción:** Documentar el comportamiento y configurar CORS cuando se despliegue el frontend en un dominio separado.

**Sugerencia de implementación futura (snippet):**
```javascript
const cors = require('cors');
const origenesPermitidos = ['https://app.plagesetic.cl', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
