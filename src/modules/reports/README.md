# 📊 API Endpoints - Reportes Académicos

## 🔗 **Endpoints Disponibles**

---

## � **REPORTES DE BOLETINES**---

## 🛠️ **IMPLEMENTACIONES TÉCNICAS AVANZADAS**

### **Sistema de Boletines Optimizado**

#### **📊 Cálculo de Áreas Reprobadas por Trimestre**

```typescript
// Implementación de cálculo separado por trimestre
const areasReprobadasQ1 = studentGrades.filter(
  (sg) => sg.trimesters.Q1.total < 51
).length;
const areasReprobadasQ2 = studentGrades.filter(
  (sg) => sg.trimesters.Q2.total < 51
).length;
const areasReprobadasQ3 = studentGrades.filter(
  (sg) => sg.trimesters.Q3.total < 51
).length;
```

#### **📑 Sistema de Múltiples Boletines por Página**

- **Algoritmo de posicionamiento**: Control automático para colocar 2 boletines por página A4
- **Prevención de superposición**: Cálculo de posición Y basado en número de materias
- **Gestión de páginas**: Sistema inteligente que agrega nueva página cada 2 boletines

```typescript
const startY = positionInPage === 0 ? 25 : 150; // Primera posición: 25mm, segunda: 150mm
```

#### **🎨 Formato de Tabla Oficial Replicado**

- **Estructura completa en tabla**: Todo el contenido del boletín dentro de una sola tabla unificada
- **Encabezados jerárquicos**: Título, información del estudiante, headers de columnas en estructura tabular
- **Colores oficiales**: Replicación exacta del formato boliviano con códigos de color específicos

#### **🔴 Indicadores Visuales Avanzados**

```typescript
// Implementación de color condicional para notas reprobadas
textColor: finalGrade < 51 ? [255, 0, 0] : [0, 0, 0]; // Rojo para reprobados
```

#### **📐 Optimización de Dimensiones**

- **Fuentes adaptables**: fontSize reducido a 7px para máxima compacidad
- **Columnas optimizadas**: Anchos específicos para cada tipo de contenido
- **Márgenes calculados**: 15mm para prevenir desbordamiento en impresión

---

## 📋 **REPORTES DE CENTRALIZADOR**### 1. **Boletines de Curso Completo**

```
GET /reports/boletines/course/{courseId}/management/{managementId}?trimester=Q1|Q2|Q3|ANUAL
```

**Descripción:** Genera boletines individuales en PDF para todos los estudiantes de un curso. Cada estudiante obtiene su propio boletín con sus calificaciones por materia.

**Parámetros:**

- `courseId`: ID del curso (número)
- `managementId`: ID de la gestión académica (número)
- `trimester`: (Opcional) Trimestre específico (Q1, Q2, Q3) o ANUAL para todas las notas

**Ejemplo:**

```
GET /reports/boletines/course/1/management/1?trimester=Q1
```

---

### 2. **Boletín Individual de Estudiante**

```
GET /reports/boletin/course/{courseId}/management/{managementId}/student/{studentId}?trimester=Q1|Q2|Q3|ANUAL
```

**Descripción:** Genera un boletín individual en PDF para un estudiante específico.

**Parámetros:**

- `courseId`: ID del curso (número)
- `managementId`: ID de la gestión académica (número)
- `studentId`: ID del estudiante (número)
- `trimester`: (Opcional) Trimestre específico (Q1, Q2, Q3) o ANUAL para todas las notas

**Ejemplo:**

```
GET /reports/boletin/course/1/management/1/student/5?trimester=ANUAL
```

**Formato de Respuesta:**

```json
{
  "ok": true,
  "boletines": [
    {
      "studentId": 5,
      "studentName": "TORREZ CAMILA VICTORIA",
      "downloadUrl": "https://firebase.storage.url/boletin.pdf",
      "fileName": "boletin_Primero_TORREZ_CAMILA_Q1_2025.pdf"
    }
  ],
  "totalStudents": 1,
  "reportInfo": {
    "course": "Primero",
    "management": "2025",
    "trimester": "Q1",
    "generatedAt": "2025-08-25T10:30:00Z"
  },
  "reportType": "boletin_individual"
}
```

**Características del PDF del Boletín:**

- 📋 **Formato oficial:** Encabezado con datos del estudiante, curso y período
- 📊 **Tabla de materias:** Lista de todas las áreas curriculares del curso en formato de tabla profesional
- 🎯 **Calificaciones por trimestre:**
  - **Trimestral:** Solo muestra la nota del trimestre seleccionado
  - **Anual:** Muestra 1T, 2T, 3T y PROMEDIO ANUAL para cada materia
- 📈 **Cálculo automático:**
  - Promedio trimestral por cada período académico
  - Total de áreas reprobadas por trimestre (3 columnas alineadas)
  - Situación académica automática
- 🎨 **Diseño profesional:**
  - Formato de tabla oficial replicando el estándar boliviano
  - Estructura completa dentro de una tabla unificada
  - Colores y bordes profesionales con grid completo
- 🔴 **Indicadores visuales:**
  - Notas reprobadas (< 51 puntos) marcadas en color rojo
  - Encabezados con fondos de color para mejor organización
- 📄 **Información adicional:**
  - Total de áreas reprobadas por trimestre (separado por columnas)
  - Situación final (APROBADO/REPROBADO)
  - Fecha de generación
- 📑 **Optimización de espacio:**
  - Diseño compacto que permite 2 boletines por página A4
  - Fuentes y espaciado optimizados para máximo aprovechamiento
  - Posicionamiento automático sin superposición

**Tipos de Boletín:**

1. **Trimestral (Q1, Q2, Q3):**

   - Muestra solo las notas del trimestre seleccionado
   - Los otros trimestres aparecen en blanco para completar posteriormente
   - Total de áreas reprobadas solo para el trimestre correspondiente
   - Ideal para entregas trimestrales y evaluaciones parciales

2. **Anual (ANUAL):**
   - Muestra todas las notas de los 3 trimestres completos
   - Incluye promedio anual calculado automáticamente por materia
   - Total de áreas reprobadas desglosado por cada trimestre (3 columnas)
   - Situación académica final con indicadores visuales (rojo para reprobados)
   - Documento oficial completo para archivo y certificación

---

## �📚 **REPORTES DE CENTRALIZADOR**

### 1. **Centralizador Anual**

```
GET /reports/centralizador/course/{courseId}/management/{managementId}
```

**Descripción:** Genera un reporte completo con las calificaciones de todos los estudiantes de un curso, mostrando las notas por trimestre, promedio final y situación académica (APROBADO/REPROBADO).

**Parámetros:**

- `courseId`: ID del curso (número)
- `managementId`: ID de la gestión académica (número)

**Ejemplo:**

```
GET /reports/centralizador/course/1/management/1
```

**Formato de Respuesta:**

```json
{
  "ok": true,
  "downloadUrl": "https://firebase.storage.url/centralizador.xlsx",
  "fileName": "centralizador_Primero_2025.xlsx",
  "totalStudents": 25,
  "totalSubjects": 8,
  "reportInfo": {
    "course": "Primero",
    "management": "2025",
    "generatedAt": "2025-08-25T10:30:00Z"
  }
}
```

**Características del Excel:**

- � **Encabezado de 2 filas:** Materias en fila superior, trimestres (1T, 2T, 3T, PR) en fila inferior
- 📊 **Cálculo automático:** Promedio por materia y promedio final
- 🎯 **Situación académica:** APROBADO (≥51 puntos) / REPROBADO (<51 puntos)
- 🎨 **Formato visual:** Celdas combinadas, colores y bordes profesionales
- 📈 **Desglose por trimestre:** Notas completas con cálculo de:
  - Saber: 45% (45 puntos)
  - Hacer: 40% (40 puntos)
  - Ser: 5% (5 puntos)
  - Decidir: 5% (5 puntos)
  - Autoevaluación: 5% (5 puntos)

---

## 📋 **REPORTES DE ASISTENCIA**

## 📋 **REPORTES DE ASISTENCIA**

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

### 2. **Reporte Mensual de Asistencia**

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

### 3. **Reporte Anual de Asistencia**

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

### 4. **Reporte por Gestión Académica de Asistencia**

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

## 📋 **Formato de Respuesta para Reportes de Asistencia**

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

## 🎨 **Características del Excel de Asistencia**

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

## 🔍 **Validaciones para Reportes de Asistencia**

### **Parámetros Comunes:**

- IDs deben ser números enteros positivos
- Año debe estar entre 2020 y 2030
- Mes debe estar entre 1 y 12

### **Fechas Personalizadas:**

- Formato obligatorio: YYYY-MM-DD
- startDate debe ser anterior a endDate
- Fechas deben ser válidas

### **Validaciones para Boletines:**

- `courseId` debe ser un número entero positivo válido
- `managementId` debe ser un número entero positivo válido
- `studentId` (si se proporciona) debe ser un número entero positivo válido
- `trimester` (opcional) debe ser uno de: Q1, Q2, Q3, ANUAL
- El curso debe existir en la base de datos
- La gestión debe existir y tener estudiantes matriculados
- El estudiante (si se especifica) debe estar matriculado en el curso
- Debe haber al menos una materia asignada al curso

### **Validaciones para Centralizador:**

- `courseId` debe ser un número entero positivo válido
- `managementId` debe ser un número entero positivo válido
- El curso debe existir en la base de datos
- La gestión debe existir y tener estudiantes matriculados
- Debe haber al menos una materia asignada al curso

---

## 📝 **Notas Técnicas Generales**

### **Para todos los reportes:**

1. **Subida a Firebase**: Los archivos se suben automáticamente a Firebase Storage
2. **Nombres de Archivo**: Formato automático con fecha y hora de generación
3. **Caché**: Los reportes no se cachean, siempre se generan datos frescos
4. **Formato Excel**: Compatible con Microsoft Excel y LibreOffice Calc
5. **Rendimiento**: Optimizado para cursos con hasta 50 estudiantes

### **Específico para Boletines:**

- **Formato PDF**: Generados con jsPDF y autoTable para máxima compatibilidad y diseño profesional
- **Almacenamiento**: Organizados por carpetas en Firebase Storage (`reports/boletines/`)
- **Nomenclatura**: `boletin_{curso}_{apellido}_{nombre}_{trimestre}_{gestion}_{timestamp}.pdf`
- **Diseño**:
  - Replica exactamente el formato oficial boliviano mostrado en la imagen de referencia
  - Tabla completa unificada con todos los elementos (título, datos, notas) dentro de la estructura
  - Grid profesional con bordes y colores oficiales
- **Flexibilidad**: Permite generar boletines trimestrales (con trimestres en blanco) o anuales (completos)
- **Escalabilidad**:
  - Optimizado para procesar curso completo o estudiante individual
  - Sistema de 2 boletines por página A4 para aprovechar el espacio
  - Prevención automática de superposición entre boletines
- **Características técnicas avanzadas:**
  - Cálculo de áreas reprobadas por trimestre individual (3 columnas separadas)
  - Indicadores visuales con color rojo para notas reprobadas (< 51 puntos)
  - Fuentes y espaciado optimizados para máxima legibilidad en formato compacto
  - Posicionamiento automático: primer boletín en posición Y=25mm, segundo en Y=150mm
  - Dimensiones optimizadas para evitar desbordamiento de márgenes

### **Específico para Centralizador:**

- **Cálculo automático**: Las notas se calculan automáticamente según los porcentajes del sistema boliviano
- **Situación académica**: Se determina automáticamente según el promedio final (≥51 = APROBADO)
- **Trimestres**: Se consideran Q1, Q2, Q3 como los tres trimestres académicos
- **Formato visual**: Excel con celdas combinadas y formato profesional de 2 filas de encabezados
