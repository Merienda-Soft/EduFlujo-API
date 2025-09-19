# Documentación de Endpoints para Calificaciones (Marks)

## Descripción General

Este módulo maneja el cálculo y almacenamiento de las calificaciones finales de los estudiantes, implementando el sistema de ponderación de tareas por dimensiones (SER, SABER, HACER, DECIDIR, AUTOEVALUACIÓN).

## Endpoints Disponibles

### 1. Calcular Notas Finales Anuales (Tabla `mark`)

**POST** `/professors/marks/calculate-final-marks`

Calcula la nota final anual de todos los estudiantes de un curso (promedio de todas las materias de los 3 trimestres).

**Request Body:**
```json
{
  "courseId": 1,
  "managementId": 1,
  "userId": 123  // Opcional: ID del usuario que ejecuta
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notas finales calculadas para 25 estudiantes",
  "data": [
    {
      "student": {
        "id": 1,
        "person": {
          "name": "Juan",
          "lastname": "Pérez"
        }
      },
      "finalGrade": 78,
      "approvalStatus": 1,
      "status": "APROBADO"
    }
  ],
  "metadata": {
    "courseId": 1,
    "managementId": 1,
    "studentsProcessed": 25,
    "executedAt": "2024-09-19T10:30:00Z",
    "executedBy": 123
  }
}
```

### 2. Calcular Notas Finales por Materia (Tabla `markSubject`)

**POST** `/professors/marks/calculate-subject-marks`

Calcula la nota final de una materia específica para todos los estudiantes de un curso (promedio de los 3 trimestres).

**Request Body:**
```json
{
  "courseId": 1,
  "subjectId": 5,
  "managementId": 1,
  "userId": 123  // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notas finales por materia calculadas para 25 estudiantes",
  "data": [
    {
      "student": {
        "id": 1,
        "person": {
          "name": "Juan",
          "lastname": "Pérez"
        }
      },
      "subject": "Matemáticas",
      "finalGrade": 82,
      "approvalStatus": 1,
      "status": "APROBADO"
    }
  ],
  "metadata": {
    "courseId": 1,
    "subjectId": 5,
    "managementId": 1,
    "studentsProcessed": 25,
    "executedAt": "2024-09-19T10:30:00Z",
    "executedBy": 123
  }
}
```

### 3. Consultar Notas Finales Anuales

**GET** `/professors/marks/final-marks/:courseId/:managementId`

Obtiene todas las notas finales anuales de un curso.

**Ejemplo:** `GET /professors/marks/final-marks/1/1`

**Response:**
```json
{
  "success": true,
  "message": "Notas finales obtenidas exitosamente",
  "data": [
    {
      "id": 1,
      "total": 78,
      "student": {
        "person": {
          "name": "Juan",
          "lastname": "Pérez"
        }
      },
      "course": {
        "course": "5° A"
      },
      "management": {
        "management": 2024
      }
    }
  ],
  "metadata": {
    "courseId": 1,
    "managementId": 1,
    "totalStudents": 25,
    "retrievedAt": "2024-09-19T10:30:00Z"
  }
}
```

### 4. Consultar Notas Finales por Materia

**GET** `/professors/marks/subject-marks/:courseId/:subjectId/:managementId`

Obtiene todas las notas finales de una materia específica.

**Ejemplo:** `GET /professors/marks/subject-marks/1/5/1`

**Response:**
```json
{
  "success": true,
  "message": "Notas por materia obtenidas exitosamente",
  "data": [
    {
      "id": 1,
      "mark_subject": 82,
      "student": {
        "person": {
          "name": "Juan",
          "lastname": "Pérez"
        }
      },
      "subject": {
        "subject": "Matemáticas"
      },
      "course": {
        "course": "5° A"
      }
    }
  ],
  "metadata": {
    "courseId": 1,
    "subjectId": 5,
    "managementId": 1,
    "totalStudents": 25,
    "retrievedAt": "2024-09-19T10:30:00Z"
  }
}
```

### 5. Health Check

**GET** `/professors/marks/health`

Verifica que el servicio funciona correctamente.

**Response:**
```json
{
  "success": true,
  "message": "Marks Controller funcionando correctamente",
  "service": "MarksService",
  "timestamp": "2024-09-19T10:30:00Z"
}
```

## Sistema de Cálculo de Notas

### Configuración de Puntajes por Dimensión
- **SER**: 5 puntos (calculado por trimestre completo)
- **SABER**: 45 puntos (calculado por meses dentro del trimestre)
- **HACER**: 40 puntos (calculado por meses dentro del trimestre)
- **DECIDIR**: 5 puntos (calculado por trimestre completo)
- **AUTOEVALUACIÓN**: 5 puntos (calculado por trimestre completo)

**Total**: 100 puntos por trimestre

### Lógica de Cálculo

1. **Para SER, DECIDIR y AUTOEVALUACIÓN:**
   - Se obtienen todas las tareas del rango completo del trimestre
   - Se calcula el porcentaje basado en el peso de cada tarea
   - El resultado se aplica al puntaje máximo de la dimensión

2. **Para SABER y HACER:**
   - Se divide el trimestre en 3 meses
   - Para cada mes se calculan las tareas con su ponderación
   - Se promedian los 3 meses para obtener el puntaje final

3. **Nota Final por Materia:**
   - Promedio de los 3 trimestres: `(Q1 + Q2 + Q3) / 3`

4. **Nota Final Anual del Estudiante:**
   - Promedio de todas las materias: `Σ(nota_materia) / total_materias`

### Ejemplo de Cálculo

```
Estudiante: Juan Pérez
Trimestre 1 - Materia: Matemáticas

SER (5 pts):
- Tarea 1: 100 puntos, peso 50% → 2.5 pts
- Tarea 2: 80 puntos, peso 50% → 2.0 pts
- Total SER: 4.5 pts

SABER (45 pts):
- Mes 1: Promedio ponderado 90% → 40.5 pts
- Mes 2: Promedio ponderado 85% → 38.25 pts  
- Mes 3: Promedio ponderado 88% → 39.6 pts
- Promedio mensual: (40.5 + 38.25 + 39.6) / 3 = 39.45 pts

HACER (40 pts): Similar cálculo mensual → 36.8 pts
DECIDIR (5 pts): Cálculo trimestral → 4.2 pts
AUTOEVALUACIÓN (5 pts): Cálculo trimestral → 4.8 pts

Total Q1: 4.5 + 39.45 + 36.8 + 4.2 + 4.8 = 89.75 pts

Nota final materia: (Q1 + Q2 + Q3) / 3
Nota final estudiante: Promedio de todas las materias
```

## Estados de Aprobación

### Campo `status` en Base de Datos:
- **1**: APROBADO (Nota ≥ 51 puntos)
- **0**: REPROBADO (Nota < 51 puntos)

### Campo `status` en Respuesta API:
- **"APROBADO"**: Nota ≥ 51 puntos
- **"REPROBADO"**: Nota < 51 puntos

**Nota**: El campo `approvalStatus` en la respuesta contiene el valor numérico (0 o 1) que se guarda en la base de datos.

## Consideraciones Importantes

1. **Llamado al Final del Ciclo**: Estos endpoints deben ejecutarse al finalizar el año escolar cuando ya se tienen todos los datos de los 3 trimestres.

2. **Actualización de Registros**: Si ya existen registros en las tablas `mark` o `markSubject`, se actualizan automáticamente.

3. **Validación de Datos**: Se verifica que existan estudiantes, materias y tareas antes del cálculo.

4. **Logs Detallados**: Todos los cálculos se registran en logs para seguimiento y debugging.

## Manejo de Errores

Los endpoints manejan los siguientes tipos de errores:

- **400 Bad Request**: Parámetros faltantes o inválidos
- **404 Not Found**: Curso, materia o gestión no encontrados
- **500 Internal Server Error**: Errores en el cálculo o base de datos

Todos los errores incluyen mensajes descriptivos para facilitar el debugging.