import {env} from '../../../core/config/env';
import Database from '../../../shared/database/connection';
const axios = require('axios');

export class AuthService {
    private db = Database.getInstance();

    async login(email: string, password: string) {
        try {
            // Realiza la petición a Auth0 para autenticar al usuario
            const response = await axios.post(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
                grant_type: 'password',
                username: email,
                password: password,
                audience: env.AUDIENCE,
                client_id: env.CLIENT_ID,
                client_secret: env.CLIENT_SECRET,
                connection: 'eduflujo',
                scope: 'openid profile email',
            });
            
            const token = response.data.access_token;
        
            // Llama a la API de Auth0 para obtener el perfil del usuario
            const userResponse = await axios.get(`https://${env.AUTH0_DOMAIN}/userinfo`, {
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
                        email: email
                    }
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
                            email: email
                        }
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
                                email: email
                            }
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
                    status: 404
                };
            }

            // Devuelve el token, el perfil del usuario y el rol
            return {
                token: token,
                user: {
                    ...userResponse.data,
                    role,
                    ...userData
                },
                success: true,
                ok: true
            }
        } catch (error) {
            console.error('Error en login:', error.response?.data || error.message);
            
            // Si es un error de Auth0
            if (error.response?.data) {
                return {
                    ok: false,
                    error: error.response.data.error_description || 'Error de autenticación',
                    status: error.response.status
                };
            }

            // Si es otro tipo de error
            return {
                ok: false,
                error: 'Error interno del servidor',
                status: 500
            };
        }
    }
}
