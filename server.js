const app = require('./app');
const connectDB = require('./config/db');

const User = require('./models/User'); // import models here

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {

        await connectDB();

        const models = [
            require('./models/User'),
            require('./models/Course'),
            require('./models/Enrollment')
        ];

        // sync indexes AFTER DB connection
        await Promise.all(models.map(m => m.syncIndexes()));
        console.log("User indexes synced");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}, http://localhost:3000/`);
        });

    } catch (err) {
        console.error("Server startup error:", err);
        process.exit(1);
    }
};

startServer();