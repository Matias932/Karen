import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import commandLogsRouter from "./command-logs";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(commandLogsRouter);
router.use(openaiRouter);

export default router;
