const User = require("../models/user");  // Asegúrate de importar correctamente el modelo de User
const { validationResult } = require("express-validator");

// Obtener todos los usuarios
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .populate("personaId", "name");  // Cargamos el estudiante/profesor asociado según el rol
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los usuarios" });
    }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("personaId", "name");
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el usuario" });
    }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, rol, personaId } = req.body;

    try {
        const newUser = new User({
            username,
            password,
            rol,
            personaId  // Aquí puede ser un estudiante o profesor según el rol
        });

        const userSave = await newUser.save();
        res.status(201).json(userSave);
    } catch (error) {
        res.status(500).json({ error: "Error al crear el usuario" });
    }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, rol, personaId } = req.body;

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        user.username = username || user.username;
        user.password = password || user.password;
        user.rol = rol || user.rol;
        user.personaId = personaId || user.personaId;  // Puede actualizar el estudiante/profesor asignado

        const userUpdate = await user.save();
        res.status(200).json(userUpdate);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el usuario" });
    }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        await user.remove();
        res.status(200).json({ message: "Usuario eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el usuario" });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
