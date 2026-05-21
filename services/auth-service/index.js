const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

// Config
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_super_secret';
const JWT_EXPIRE_MINUTES = 120;
const PORT = 8000;

// Database
const sequelize = new Sequelize(DATABASE_URL, { logging: false });

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'USER' }
}, {
    tableName: 'users',
    timestamps: false
});

// App setup
const app = express();
app.use(express.json());

// Schemas
const signupSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(64),
    role: z.string().regex(/^(ADMIN|USER)$/).default('USER')
});

const loginSchema = z.object({
    username: z.string(),
    password: z.string()
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/signup', async (req, res) => {
    try {
        const payload = signupSchema.parse(req.body);
        const existing = await User.findOne({ where: { username: payload.username } });
        if (existing) {
            return res.status(409).json({ detail: "Username already exists" });
        }
        
        const password_hash = await bcrypt.hash(payload.password, 10);
        const user = await User.create({
            username: payload.username,
            password_hash,
            role: payload.role
        });

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: `${JWT_EXPIRE_MINUTES}m` });
        res.status(201).json({ access_token: token, token_type: "bearer" });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const payload = loginSchema.parse(req.body);
        const user = await User.findOne({ where: { username: payload.username } });
        
        if (!user || !(await bcrypt.compare(payload.password, user.password_hash))) {
            return res.status(401).json({ detail: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: `${JWT_EXPIRE_MINUTES}m` });
        res.json({ access_token: token, token_type: "bearer" });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

app.get('/validate', (req, res) => {
    const authorization = req.headers.authorization;
    console.log("Validate called with auth header:", authorization ? "Present" : "Missing");
    if (!authorization || !authorization.startsWith("Bearer ")) {
        console.log("No valid bearer token");
        return res.status(401).json({ detail: "Missing or invalid token" });
    }

    const token = authorization.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Token decoded successfully:", decoded);
        res.setHeader("X-User-Id", decoded.userId.toString());
        res.setHeader("X-Role", decoded.role);
        res.status(200).send();
    } catch (e) {
        console.error("Token verification failed:", e.message);
        res.status(401).json({ detail: "Invalid token" });
    }
});

// Initialize
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Auth Service running on port ${PORT}`);
    });
}).catch(console.error);
