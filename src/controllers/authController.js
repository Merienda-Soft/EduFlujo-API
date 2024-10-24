const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUDIENCE = process.env.AUDIENCE;

// Función para autenticar usuario
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Realiza la petición a Auth0 para autenticar al usuario
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'password',
      username: email,
      password: password,
      audience: AUDIENCE,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      connection: 'eduflujo',
      scope: 'openid profile email',
    });
    const token = response.data.access_token;

    // Llama a la API de Auth0 para obtener el perfil del usuario
    const userResponse = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Devuelve el token y el perfil del usuario
    res.json({
      token: token,
      user: userResponse.data,
      success: true,
    });
  } catch (error) {
    // Manejo del error de autenticación
    res.status(401).json({
      error: error,
      success: false,
      message: 'Error en la autenticación',
    });
  }
};

