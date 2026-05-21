const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const { z } = require('zod');
const axios = require('axios');

// Config
const DATABASE_URL = process.env.DATABASE_URL;
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
const PORT = 8000;

// Database
const sequelize = new Sequelize(DATABASE_URL, { logging: false });

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PLACED' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
}, {
    tableName: 'orders',
    timestamps: false
});

// App setup
const app = express();
app.use(express.json());

// Middlewares
const getCurrentUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-role'];
    if (!userId || !role) return res.status(401).json({ detail: 'Unauthenticated' });
    req.user = { userId: parseInt(userId, 10), role };
    next();
};

// Schemas
const createOrderSchema = z.object({
    product_id: z.number().int(),
    quantity: z.number().int().positive(),
    email: z.string().email()
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/orders', getCurrentUser, async (req, res) => {
    if (!['USER', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ detail: 'Forbidden' });
    }

    try {
        const payload = createOrderSchema.parse(req.body);
        
        // Decrease stock
        try {
            await axios.post(`${INVENTORY_SERVICE_URL}/internal/decrease-stock`, 
                { product_id: payload.product_id, quantity: payload.quantity },
                { 
                    headers: { 
                        'x-user-id': req.user.userId.toString(), 
                        'x-role': req.user.role 
                    },
                    timeout: 10000 
                }
            );
        } catch (err) {
            return res.status(400).json({ detail: 'Failed to reserve stock' });
        }

        // Create order
        const order = await Order.create({
            user_id: req.user.userId,
            product_id: payload.product_id,
            quantity: payload.quantity,
            status: 'PLACED'
        });

        // Send email
        axios.post(`${NOTIFICATION_SERVICE_URL}/send-email`, 
            {
                email: payload.email,
                subject: 'Order Placed Successfully',
                message: `Your order #${order.id} was placed successfully.`
            },
            { 
                headers: { 
                    'x-user-id': req.user.userId.toString(), 
                    'x-role': req.user.role 
                }
            }
        ).catch(e => console.error("Failed to send email", e.message));

        res.status(201).json(order);
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

app.get('/orders', getCurrentUser, async (req, res) => {
    let whereClause = {};
    if (req.user.role === 'USER') {
        whereClause.user_id = req.user.userId;
    }
    const orders = await Order.findAll({ where: whereClause, order: [['id', 'DESC']] });
    res.json(orders);
});

// Initialize
sequelize.sync().then(() => {
    app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));
}).catch(console.error);
