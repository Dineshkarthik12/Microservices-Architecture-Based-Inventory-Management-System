const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const { z } = require('zod');

// Config
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = 8000;

// Database
const sequelize = new Sequelize(DATABASE_URL, { logging: false });

const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
}, {
    tableName: 'products',
    timestamps: false
});

// App setup
const app = express();
app.use(express.json());

// Middlewares
const requireAdmin = (req, res, next) => {
    const role = req.headers['x-role'];
    if (role !== 'ADMIN') return res.status(403).json({ detail: 'Admin access required' });
    next();
};

const requireUserContext = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-role'];
    if (!userId || !role) return res.status(401).json({ detail: 'Missing user context' });
    req.user = { userId: parseInt(userId, 10), role };
    next();
};

// Schemas
const productCreateSchema = z.object({
    name: z.string().min(2).max(120),
    stock: z.number().int().min(0)
});

const productUpdateStockSchema = z.object({
    stock: z.number().int().min(0)
});

const productDecreaseStockSchema = z.object({
    product_id: z.number().int(),
    quantity: z.number().int().positive()
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/products', async (req, res) => {
    const products = await Product.findAll({ order: [['id', 'DESC']] });
    res.json(products);
});

app.post('/products', requireAdmin, async (req, res) => {
    try {
        const payload = productCreateSchema.parse(req.body);
        const product = await Product.create({ name: payload.name, stock: payload.stock });
        res.status(201).json(product);
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

app.patch('/products/:product_id/stock', requireAdmin, async (req, res) => {
    try {
        const payload = productUpdateStockSchema.parse(req.body);
        const product = await Product.findByPk(req.params.product_id);
        if (!product) return res.status(404).json({ detail: 'Product not found' });
        
        product.stock = payload.stock;
        await product.save();
        res.json(product);
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

app.post('/internal/decrease-stock', requireUserContext, async (req, res) => {
    try {
        const payload = productDecreaseStockSchema.parse(req.body);
        const [updatedRows] = await Product.update(
            { stock: sequelize.literal(`stock - ${payload.quantity}`) },
            { 
                where: { 
                    id: payload.product_id, 
                    stock: { [Sequelize.Op.gte]: payload.quantity } 
                }
            }
        );

        if (updatedRows === 0) {
            return res.status(400).json({ detail: 'Insufficient stock or product not found' });
        }
        res.json({ success: true });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

// Initialize
sequelize.sync().then(() => {
    app.listen(PORT, () => console.log(`Inventory Service running on port ${PORT}`));
}).catch(console.error);
