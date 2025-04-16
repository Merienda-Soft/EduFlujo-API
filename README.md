# 🚀 API REST Pedalid - Sistema de Gestión LMS  

Esta API centraliza toda la información del proyecto principal, proporcionando endpoints críticos para las aplicaciones móviles y web relacionadas con el sistema de gestión de aprendizaje (LMS).

## 📦 Dependencias Principales  
- **Prisma** (ORM para PostgreSQL)  
- **Express** (Servidor API)  
- **PostgreSQL** (Base de datos relacional)  

## 🔧 Configuración Inicial (Modo Desarrollo)  

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos (crea migraciones)
npx prisma migrate dev --name init

# 3. Generar cliente Prisma
npx prisma generate

# 4. Iniciar servidor en modo desarrollo
npm run dev
