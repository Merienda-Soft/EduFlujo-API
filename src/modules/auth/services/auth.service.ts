import { env } from '../../../core/config/env';
import Database from '../../../shared/database/connection';
import { emailService } from '../../registration/services/email.service';
const axios = require('axios');
const email_service = new emailService();

export class AuthService {
  private db = Database.getInstance();

  private auth0Config = {
    domain: `https://${env.AUTH0_DOMAIN}`,
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    audience: env.AUDIENCE,
    connection: 'eduflujo',
    studentRoleId: 'rol_2uyG1s1h8icn0Qjb',
    tutorRoleId: 'rol_x5EOWJgcV0lCoVAi'
  };

  async login(email: string, password: string) {
    try {
      // Realiza la petición a Auth0 para autenticar al usuario
      const response = await axios.post(`${this.auth0Config.domain}/oauth/token`, {
        grant_type: 'password',
        username: email,
        password: password,
        audience: this.auth0Config.audience,
        client_id: this.auth0Config.clientId,
        client_secret: this.auth0Config.clientSecret,
        connection: this.auth0Config.connection,
        scope: 'openid profile email',
      });

      const token = response.data.access_token;

      // Llama a la API de Auth0 para obtener el perfil del usuario
      const userResponse = await axios.get(`${this.auth0Config.domain}/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Buscar el rol del usuario
      let role = null;
      let userData = null;

      // Buscar en la tabla de profesores
      const professor = await this.db.professor.findFirst({
        where: {
          person: {
            email: email,
          },
        },
      });

      if (professor) {
        role = 'professor';
        userData = professor;
      } else {
        // Buscar en la tabla de tutores
        const tutor = await this.db.tutor.findFirst({
          where: {
            person: {
              email: email,
            },
          },
        });

        if (tutor) {
          role = 'tutor';
          userData = tutor;
        } else {
          // Buscar en la tabla de estudiantes
          const student = await this.db.student.findFirst({
            where: {
              person: {
                email: email,
              },
            },
          });

          if (student) {
            role = 'student';
            userData = student;
          }
        }
      }

      if (!role || !userData) {
        return {
          ok: false,
          error: 'Usuario no encontrado en el sistema',
          status: 404,
        };
      }

      // Devuelve el token, el perfil del usuario y el rol
      return {
        token: token,
        user: {
          ...userResponse.data,
          role,
          ...userData,
        },
        success: true,
        ok: true,
      };
    } catch (error) {
      console.error('Error en login:', error.response?.data || error.message);

      // Si es un error de Auth0
      if (error.response?.data) {
        return {
          ok: false,
          error: error.response.data.error_description || 'Error de autenticación',
          status: error.response.status,
        };
      }

      // Si es otro tipo de error
      return {
        ok: false,
        error: 'Error interno del servidor',
        status: 500,
      };
    }
  }

  async createStudentUsers(users: { email: string; password: string }[]) {
    try {
      const managementToken = await this.getManagementToken();
      const createdUsers = [];
      const BATCH_SIZE = 5; 
      const DELAY_MS = 1000; 
  
      // Procesar usuarios en lotes
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (user) => {
            try {
              // Crear usuario en Auth0
              const response = await axios.post(
                `${this.auth0Config.domain}/api/v2/users`,
                {
                  email: user.email,
                  password: user.password,
                  connection: this.auth0Config.connection,
                  verify_email: true,
                  app_metadata: { role: 'student' },
                },
                { headers: { Authorization: `Bearer ${managementToken}` } }
              );
  
              const userId = response.data.user_id;
  
              // Asignar rol si está configurado
              if (this.auth0Config.studentRoleId) {
                await axios.post(
                  `${this.auth0Config.domain}/api/v2/roles/${this.auth0Config.studentRoleId}/users`,
                  { users: [userId] },
                  { headers: { Authorization: `Bearer ${managementToken}` } }
                );
              }
  
              return {
                email: user.email,
                status: 'success',
                user: response.data,
              };
            } catch (error) {
              console.error(`Error al crear usuario ${user.email}:`, error.response?.data || error.message);
              return {
                email: user.email,
                status: 'error',
                error: error.response?.data?.message || 'Error al crear usuario',
              };
            }
          })
        );
  
        createdUsers.push(...batchResults);
  
        // Esperar antes del siguiente lote (excepto en la última iteración)
        if (i + BATCH_SIZE < users.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
  
      return { ok: true, createdUsers };
    } catch (error) {
      console.error('Error al procesar la lista de usuarios:', error.response?.data || error.message);
      return { ok: false, error: 'Error interno del servidor', status: 500 };
    }
  } 

  async createTutorUser(email: string) {
    try {
      const managementToken = await this.getManagementToken();
      const password = email_service.generatePassword(); 
      const response = await axios.post(
        `${this.auth0Config.domain}/api/v2/users`,
        {
          email: email,
          password: password,
          connection: this.auth0Config.connection,
          verify_email: true,
          app_metadata: { role: 'tutor' },
          user_metadata: {
            temporaryPassword: password,
          },
        },
        { headers: { Authorization: `Bearer ${managementToken}` } }
      );

      const userId = response.data.user_id;

      if (this.auth0Config.tutorRoleId) {
        await axios.post(
          `${this.auth0Config.domain}/api/v2/roles/${this.auth0Config.tutorRoleId}/users`,
          { users: [userId] },
          { headers: { Authorization: `Bearer ${managementToken}` } }
        );
      }

      return { 
        ok: true, 
        createdUser: {
          email: email,
          status: 'success',
          user: response.data
        }
      };
    } catch (error) {
      console.error(`Error al crear usuario ${email}:`, error.response?.data || error.message);
      return { 
        ok: false, 
        error: {
          email: email,
          status: 'error',
          error: error.response?.data?.message || 'Error al crear usuario',
          details: error.response?.data || error.message
        }
      };
    }
  }

  private async getManagementToken() {
    try {
      const response = await axios.post(`${this.auth0Config.domain}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.auth0Config.clientId,
        client_secret: this.auth0Config.clientSecret,
        audience: `${this.auth0Config.domain}/api/v2/`,
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error al obtener el token de gestión:', error.response?.data || error.message);
      throw new Error('No se pudo obtener el token de gestión de Auth0');
    }
  }
}