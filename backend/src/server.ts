import app from "./app.js";
import "dotenv/config";

const PORT = process.env.PORT || 3000;

async function startServer() {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();
