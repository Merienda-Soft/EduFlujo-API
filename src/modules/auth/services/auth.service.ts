import {env} from '../../../core/config/env';
const axios = require('axios');

export class AuthService {

    async login(email: string, password: string) {
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
        // Devuelve el token y el perfil del usuario
        return {
            token: token,
            user: userResponse.data,
            success: true,
        }
    }
}
