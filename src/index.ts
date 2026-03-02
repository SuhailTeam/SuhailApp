import { SuhailApp } from "./app";
import { config } from "./utils/config";
import { Logger } from "./utils/logger";

const logger = new Logger("Main");

logger.info("Starting Suhail — AI Smart Glasses Assistant");
logger.info(`Package: ${config.packageName}`);
logger.info(`Port: ${config.port}`);
logger.info(`Language: ${config.defaultLanguage}`);

const app = new SuhailApp();
app.start();

logger.info(`Suhail server is running on port ${config.port}`);
logger.info("Waiting for Mentra Live glasses to connect...");
