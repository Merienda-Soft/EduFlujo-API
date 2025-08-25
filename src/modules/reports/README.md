# 📊 API Endpoints - Reportes de Asistencia

## 🔗 **Endpoints Disponibles**

### 1. **Reporte por Rango de Fechas Personalizado**

```
GET /reports/attendance/custom/course/{courseId}/subject/{subjectId}/professor/{professorId}/management/{managementId}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Parámetros:**

- `courseId`: ID del curso (número)
- `subjectId`: ID de la materia (número)
- `professorId`: ID del profesor (número)
- `managementId`: ID de la gestión (número)
- `startDate`: Fecha de inicio (formato: YYYY-MM-DD)
- `endDate`: Fecha de fin (formato: YYYY-MM-DD)

**Ejemplo:**

```
GET /reports/attendance/custom/course/1/subject/1/professor/1/management/1?startDate=2025-08-01&endDate=2025-08-31
```

---

### 2. **Reporte Mensual**

```
GET /reports/attendance/monthly/{year}/{month}/course/{courseId}/subject/{subjectId}/professor/{professorId}/management/{managementId}
```

**Parámetros:**

- `year`: Año (número entre 2020-2030)
- `month`: Mes (número entre 1-12)
- Demás parámetros iguales al anterior

**Ejemplo:**

```
GET /reports/attendance/monthly/2025/8/course/1/subject/1/professor/1/management/1
```

---

### 3. **Reporte Anual**

```
GET /reports/attendance/yearly/{year}/course/{courseId}/subject/{subjectId}/professor/{professorId}/management/{managementId}
```

**Parámetros:**

- `year`: Año (número entre 2020-2030)
- Demás parámetros iguales

**Ejemplo:**

```
GET /reports/attendance/yearly/2025/course/1/subject/1/professor/1/management/1
```

---

### 4. **Reporte por Gestión Académica**

```
GET /reports/attendance/management/course/{courseId}/subject/{subjectId}/professor/{professorId}/management/{managementId}
```

**Parámetros:**

- Solo los IDs básicos (usa fechas de la gestión en BD)

**Ejemplo:**

```
GET /reports/attendance/management/course/1/subject/1/professor/1/management/1
```

---

## 📋 **Formato de Respuesta**

### **Respuesta Exitosa:**

```json
{
  "ok": true,
  "downloadUrl": "https://firebase.storage.url/archivo.xlsx",
  "fileName": "reporte_asistencia_Priemro_Matematicas_2025-08-25.xlsx",
  "totalStudents": 2,
  "reportPeriod": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-31"
  },
  "reportType": "monthly|yearly|custom_date|management",
  "period": {
    // Información específica según el tipo de reporte
    "year": 2025,
    "month": 8,
    "monthName": "agosto",
    "managementYear": 2025,
    "academicPeriod": "Gestión 2025",
    "customRange": true
  }
}
```

### **Respuesta de Error:**

```json
{
  "ok": false,
  "error": "Descripción del error",
  "details": [
    // Detalles de validación (si aplica)
  ]
}
```

---

## 🎨 **Características del Excel Generado**

### **Diseño Visual:**

- ✅ Encabezado con información del curso, materia, profesor y gestión
- ✅ Estructura mensual con días laborables (L-V)
- ✅ Códigos de color para diferentes tipos de asistencia
- ✅ Filas alternadas para mejor legibilidad
- ✅ Leyenda explicativa con colores

### **Códigos de Asistencia:**

- 🟢 **P**: Presente (Verde)
- 🔴 **A**: Ausente (Rojo)
- 🟠 **L**: Licencia/Justificado (Naranja)
- 🟤 **T**: Tardanza (Naranja oscuro)
- ⚫ **-**: Sin registro (Gris)

### **Información Incluida:**

- Nombres completos de estudiantes (ordenados alfabéticamente)
- Fechas organizadas por mes
- Días de la semana (L, M, X, J, V)
- Estadísticas por estudiante
- Resumen general del reporte

---

## 🔍 **Validaciones**

### **Parámetros Comunes:**

- IDs deben ser números enteros positivos
- Año debe estar entre 2020 y 2030
- Mes debe estar entre 1 y 12

### **Fechas Personalizadas:**

- Formato obligatorio: YYYY-MM-DD
- startDate debe ser anterior a endDate
- Fechas deben ser válidas

### **Gestión:**

- La gestión debe existir en la base de datos
- Si no tiene fechas específicas, usa febrero-diciembre del año de gestión

---

## 📝 **Notas Técnicas**

1. **Subida a Firebase**: Los archivos se suben automáticamente a Firebase Storage
2. **Nombres de Archivo**: Formato automático con fecha y hora de generación
3. **Caché**: Los reportes no se cachean, siempre se generan datos frescos
4. **Formato Excel**: Compatible con Microsoft Excel y LibreOffice Calc
5. **Rendimiento**: Optimizado para cursos con hasta 50 estudiantes
