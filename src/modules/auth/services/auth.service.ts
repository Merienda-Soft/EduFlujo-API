import { env } from '../../../core/config/env';
import Database from '../../../shared/database/connection';
const axios = require('axios');

export class AuthService {
  private db = Database.getInstance();

  // Datos comunes reutilizables para Auth0
  private auth0Config = {
    domain: `https://${env.AUTH0_DOMAIN}`,
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    audience: env.AUDIENCE,
    connection: 'eduflujo',
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
      const managementToken = await this.getManagementToken(); // Obtener el token de gestión una vez
      const createdUsers = [];
  
      for (const user of users) {
        try {
         //Create new user in Auth0
          const response = await axios.post(
            `${this.auth0Config.domain}/api/v2/users`,
            {
              email: user.email,
              password: user.password,
              connection: this.auth0Config.connection,
              verify_email: true,
              app_metadata: {
                role: 'student',
              },
            },
            {
              headers: {
                Authorization: `Bearer ${managementToken}`,
              },
            }
          );
  
          createdUsers.push({
            email: user.email,
            status: 'success',
            user: response.data,
          });
        } catch (error) {
          console.error(`Error al crear usuario ${user.email}:`, error.response?.data || error.message);
  
          createdUsers.push({
            email: user.email,
            status: 'error',
            error: error.response?.data?.message || 'Error al crear usuario',
          });
        }
      }
  
      return {
        ok: true,
        createdUsers,
      };
    } catch (error) {
      console.error('Error al procesar la lista de usuarios:', error.response?.data || error.message);
  
      return {
        ok: false,
        error: 'Error interno del servidor',
        status: 500,
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